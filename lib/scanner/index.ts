import { detectManifests } from './github';
import { parseManifest } from './parse';
import { fetchLatestVersions } from './registry';
import { checkVulnerabilitiesBatch } from './osv';
import { classifyStatus, calcDaysBehind } from './classify';
import type { EnrichedDep, RawDep, Ecosystem, ManifestFile } from './types';

export type { EnrichedDep, RawDep };

function deduplicateDeps(deps: RawDep[]): RawDep[] {
  const seen = new Map<string, RawDep>();
  for (const dep of deps) {
    const key = `${dep.ecosystem}:${dep.name}`;
    const existing = seen.get(key);
    if (!existing || dep.type === 'production') seen.set(key, dep);
  }
  return Array.from(seen.values());
}

function changelogUrl(name: string, ecosystem: Ecosystem): string {
  switch (ecosystem) {
    case 'npm':      return `https://www.npmjs.com/package/${name}?activeTab=versions`;
    case 'pypi':     return `https://pypi.org/project/${name}/#history`;
    case 'cargo':    return `https://crates.io/crates/${name}/versions`;
    case 'go':       return `https://pkg.go.dev/${name}#section-versions`;
    case 'rubygems': return `https://rubygems.org/gems/${name}/versions`;
  }
}

const MANIFEST_ECOSYSTEM: Record<string, Ecosystem> = {
  'package.json':     'npm',
  'requirements.txt': 'pypi',
  'pyproject.toml':   'pypi',
  'Pipfile':          'pypi',
  'Cargo.toml':       'cargo',
  'go.mod':           'go',
  'Gemfile':          'rubygems',
};

export function detectManifestFilename(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed.dependencies || parsed.devDependencies) return 'package.json';
  } catch {}
  if (content.includes('[package]') && content.includes('[dependencies]')) return 'Cargo.toml';
  if (content.includes('[tool.poetry]') || content.includes('[project]')) return 'pyproject.toml';
  if (content.includes('[packages]') && content.includes('[dev-packages]')) return 'Pipfile';
  if (content.match(/^module\s+/m) && content.includes('require')) return 'go.mod';
  if (content.match(/^gem\s+['"]/m)) return 'Gemfile';
  if (content.match(/^[A-Za-z0-9_.-]+(==|>=|<=|~=)/m)) return 'requirements.txt';
  return 'package.json';
}

async function enrichDeps(rawDeps: RawDep[]): Promise<EnrichedDep[]> {
  const withLatest = await fetchLatestVersions(rawDeps);
  const withVulns = await checkVulnerabilitiesBatch(withLatest);
  return withVulns.map((dep) => {
    const status = classifyStatus(dep.currentVersion, dep.latest, dep.deprecated, dep.vulnCount);
    const daysBehind = calcDaysBehind(dep.publishedAt, status);
    return {
      name: dep.name,
      currentVersion: dep.currentVersion,
      type: dep.type,
      ecosystem: dep.ecosystem,
      latestVersion: dep.latest,
      isDeprecated: dep.deprecated,
      publishedAt: dep.publishedAt,
      vulnCount: dep.vulnCount,
      vulnSeverity: dep.vulnSeverity,
      cveIds: dep.cveIds,
      status,
      daysBehind,
      license: dep.license ?? null,
      weeklyDownloads: dep.weeklyDownloads ?? null,
      changelogUrl: changelogUrl(dep.name, dep.ecosystem),
    };
  });
}

export async function scanFromContent(
  content: string,
  filename?: string,
): Promise<{ deps: EnrichedDep[]; detectedEcosystems: string[] }> {
  const file = filename ?? detectManifestFilename(content);
  const ecosystem = MANIFEST_ECOSYSTEM[file] ?? 'npm';
  const manifest: ManifestFile = { path: file, ecosystem, content };
  const rawDeps = deduplicateDeps(parseManifest(manifest));
  if (rawDeps.length === 0) return { deps: [], detectedEcosystems: [] };
  const deps = await enrichDeps(rawDeps);
  return { deps, detectedEcosystems: [ecosystem] };
}

export async function scanProject(
  githubRepo: string,
  defaultBranch: string,
  githubToken: string,
): Promise<{ deps: EnrichedDep[]; detectedEcosystems: string[] }> {
  const manifests = await detectManifests(githubRepo, defaultBranch, githubToken);
  if (manifests.length === 0) return { deps: [], detectedEcosystems: [] };

  const detectedEcosystems = [...new Set(manifests.map((m) => m.ecosystem))];
  const rawDeps = deduplicateDeps(manifests.flatMap(parseManifest));

  const deps = await enrichDeps(rawDeps);
  return { deps, detectedEcosystems };
}

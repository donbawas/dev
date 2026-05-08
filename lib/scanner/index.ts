import { detectManifests } from './github';
import { parseManifest } from './parse';
import { fetchLatestVersions } from './registry';
import { checkVulnerabilitiesBatch } from './osv';
import { classifyStatus, calcDaysBehind } from './classify';
import type { EnrichedDep, RawDep, Ecosystem } from './types';

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

export async function scanProject(
  githubRepo: string,
  defaultBranch: string,
  githubToken: string,
): Promise<{ deps: EnrichedDep[]; detectedEcosystems: string[] }> {
  const manifests = await detectManifests(githubRepo, defaultBranch, githubToken);
  if (manifests.length === 0) return { deps: [], detectedEcosystems: [] };

  const detectedEcosystems = [...new Set(manifests.map((m) => m.ecosystem))];
  const rawDeps = deduplicateDeps(manifests.flatMap(parseManifest));

  const withLatest = await fetchLatestVersions(rawDeps);
  const withVulns = await checkVulnerabilitiesBatch(withLatest);

  const enriched: EnrichedDep[] = withVulns.map((dep) => {
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

  return { deps: enriched, detectedEcosystems };
}

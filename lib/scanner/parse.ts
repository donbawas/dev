import { parse as parseToml } from 'smol-toml';
import type { ManifestFile, RawDep, DepType } from './types';

function cleanVersion(v: string): string {
  return v.replace(/^[\^~>=<!\s*]+/, '').split(/[,\s]/)[0] ?? '';
}

// ── npm ────────────────────────────────────────────────────────────────────

function parsePackageJson(content: string): RawDep[] {
  const pkg = JSON.parse(content);
  const deps: RawDep[] = [];

  const add = (map: Record<string, string> | undefined, type: DepType) => {
    for (const [name, version] of Object.entries(map ?? {})) {
      const v = cleanVersion(version);
      if (v) deps.push({ name, currentVersion: v, type, ecosystem: 'npm' });
    }
  };

  add(pkg.dependencies, 'production');
  add(pkg.devDependencies, 'dev');
  add(pkg.peerDependencies, 'peer');
  return deps;
}

// ── pip / requirements.txt ─────────────────────────────────────────────────

function parseRequirementsTxt(content: string): RawDep[] {
  const deps: RawDep[] = [];
  for (const raw of content.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#') || l.startsWith('-')) continue;
    const match = l.match(/^([A-Za-z0-9_.-]+)\s*[=><!~^]+\s*([^\s,;#]+)/);
    if (match) {
      deps.push({ name: match[1], currentVersion: cleanVersion(match[2]), type: 'production', ecosystem: 'pypi' });
    } else {
      const name = l.split(/[=><!~^]/)[0].trim();
      if (name) deps.push({ name, currentVersion: '', type: 'production', ecosystem: 'pypi' });
    }
  }
  return deps;
}

// ── pyproject.toml (Poetry + PEP 621) ─────────────────────────────────────

function parsePyprojectToml(content: string): RawDep[] {
  const deps: RawDep[] = [];
  let toml: Record<string, unknown>;
  try { toml = parseToml(content) as Record<string, unknown>; } catch { return deps; }

  // PEP 621 format: [project] dependencies = ["requests>=2.0"]
  const projectDeps = (toml?.project as Record<string, unknown>)?.dependencies;
  if (Array.isArray(projectDeps)) {
    for (const d of projectDeps as string[]) {
      const match = d.match(/^([A-Za-z0-9_.-]+)\s*(.*)$/);
      if (match) deps.push({ name: match[1], currentVersion: cleanVersion(match[2] || ''), type: 'production', ecosystem: 'pypi' });
    }
  }

  // Poetry format: [tool.poetry.dependencies]
  const tool = toml?.tool as Record<string, unknown> | undefined;
  const poetry = tool?.poetry as Record<string, unknown> | undefined;

  const addPoetryDeps = (map: unknown, type: DepType) => {
    if (!map || typeof map !== 'object') return;
    for (const [name, val] of Object.entries(map as Record<string, unknown>)) {
      if (name === 'python') continue;
      const v = typeof val === 'string' ? val : (val as Record<string, string>)?.version ?? '';
      deps.push({ name, currentVersion: cleanVersion(v), type, ecosystem: 'pypi' });
    }
  };

  addPoetryDeps(poetry?.dependencies, 'production');
  addPoetryDeps((poetry as Record<string, unknown>)?.['dev-dependencies'], 'dev');
  addPoetryDeps(
    ((poetry as Record<string, unknown>)?.group as Record<string, { dependencies?: unknown }>)?.dev?.dependencies,
    'dev',
  );

  return deps;
}

// ── Pipfile ────────────────────────────────────────────────────────────────

function parsePipfile(content: string): RawDep[] {
  const deps: RawDep[] = [];
  let toml: Record<string, unknown>;
  try { toml = parseToml(content) as Record<string, unknown>; } catch { return deps; }

  const addSection = (section: unknown, type: DepType) => {
    if (!section || typeof section !== 'object') return;
    for (const [name, val] of Object.entries(section as Record<string, unknown>)) {
      if (name === 'python_version') continue;
      const v = typeof val === 'string' ? val : (val as Record<string, string>)?.version ?? '*';
      if (v !== '*') deps.push({ name, currentVersion: cleanVersion(v), type, ecosystem: 'pypi' });
    }
  };

  addSection(toml?.packages, 'production');
  addSection(toml?.['dev-packages'], 'dev');
  return deps;
}

// ── Cargo.toml ─────────────────────────────────────────────────────────────

function parseCargoToml(content: string): RawDep[] {
  const deps: RawDep[] = [];
  let toml: Record<string, unknown>;
  try { toml = parseToml(content) as Record<string, unknown>; } catch { return deps; }

  const addSection = (section: unknown, type: DepType) => {
    if (!section || typeof section !== 'object') return;
    for (const [name, val] of Object.entries(section as Record<string, unknown>)) {
      const v = typeof val === 'string' ? val : (val as Record<string, string>)?.version ?? '';
      if (v) deps.push({ name, currentVersion: cleanVersion(v), type, ecosystem: 'cargo' });
    }
  };

  addSection(toml?.dependencies, 'production');
  addSection(toml?.['dev-dependencies'], 'dev');
  addSection(toml?.['build-dependencies'], 'dev');
  return deps;
}

// ── go.mod ─────────────────────────────────────────────────────────────────

function parseGoMod(content: string): RawDep[] {
  const deps: RawDep[] = [];
  let inRequire = false;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('require (')) { inRequire = true; continue; }
    if (inRequire && line === ')') { inRequire = false; continue; }

    const match = inRequire
      ? line.match(/^([^\s]+)\s+v([^\s]+)/)
      : line.match(/^require\s+([^\s]+)\s+v([^\s]+)/);

    if (match) {
      deps.push({ name: match[1], currentVersion: match[2], type: 'production', ecosystem: 'go' });
    }
  }
  return deps;
}

// ── Gemfile ─────────────────────────────────────────────────────────────────

function parseGemfile(content: string): RawDep[] {
  const deps: RawDep[] = [];
  for (const raw of content.split('\n')) {
    const l = raw.trim();
    if (!l.startsWith('gem ')) continue;
    const match = l.match(/^gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/);
    if (match) {
      deps.push({ name: match[1], currentVersion: cleanVersion(match[2] ?? ''), type: 'production', ecosystem: 'rubygems' });
    }
  }
  return deps;
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

export function parseManifest(manifest: ManifestFile): RawDep[] {
  try {
    switch (manifest.path) {
      case 'package.json':     return parsePackageJson(manifest.content);
      case 'requirements.txt': return parseRequirementsTxt(manifest.content);
      case 'pyproject.toml':   return parsePyprojectToml(manifest.content);
      case 'Pipfile':          return parsePipfile(manifest.content);
      case 'Cargo.toml':       return parseCargoToml(manifest.content);
      case 'go.mod':           return parseGoMod(manifest.content);
      case 'Gemfile':          return parseGemfile(manifest.content);
      default:                 return [];
    }
  } catch {
    return [];
  }
}

import type { Ecosystem } from './types';

export interface RegistryResult {
  latest: string;
  deprecated: boolean;
  publishedAt: string | null;
  license: string | null;
  weeklyDownloads: number | null;
}

const EMPTY: RegistryResult = { latest: '', deprecated: false, publishedAt: null, license: null, weeklyDownloads: null };

// ── npm ────────────────────────────────────────────────────────────────────

async function fetchNpm(name: string): Promise<RegistryResult> {
  try {
    const [pkgRes, dlRes] = await Promise.all([
      fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, { headers: { Accept: 'application/json' } }),
      fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`),
    ]);
    if (!pkgRes.ok) return EMPTY;
    const d = await pkgRes.json();
    const dl = dlRes.ok ? await dlRes.json() : null;
    return {
      latest: d.version ?? '',
      deprecated: !!d.deprecated,
      publishedAt: d.time?.modified ?? null,
      license: d.license ?? null,
      weeklyDownloads: dl?.downloads ?? null,
    };
  } catch { return EMPTY; }
}

// ── PyPI ───────────────────────────────────────────────────────────────────

async function fetchPypi(name: string): Promise<RegistryResult> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    if (!res.ok) return EMPTY;
    const d = await res.json();
    return {
      latest: d.info?.version ?? '',
      publishedAt: d.urls?.[0]?.upload_time ?? null,
      deprecated: !!(d.info?.yanked || d.info?.classifiers?.includes('Development Status :: 7 - Inactive')),
      license: d.info?.license || null,
      weeklyDownloads: null,
    };
  } catch { return EMPTY; }
}

// ── crates.io ──────────────────────────────────────────────────────────────

async function fetchCargo(name: string): Promise<RegistryResult> {
  try {
    const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
      headers: { 'User-Agent': 'devpulse-app/1.0' },
    });
    if (!res.ok) return EMPTY;
    const d = await res.json();
    return {
      latest: d.crate?.max_stable_version ?? d.crate?.max_version ?? '',
      deprecated: false,
      publishedAt: null,
      license: d.crate?.license ?? null,
      weeklyDownloads: d.crate?.recent_downloads ?? null,
    };
  } catch { return EMPTY; }
}

// ── Go proxy ───────────────────────────────────────────────────────────────

async function fetchGo(module: string): Promise<RegistryResult> {
  try {
    const encoded = module.replace(/([A-Z])/g, (c) => `!${c.toLowerCase()}`);
    const res = await fetch(`https://proxy.golang.org/${encoded}/@latest`);
    if (!res.ok) return EMPTY;
    const d = await res.json();
    return { latest: (d.Version ?? '').replace(/^v/, ''), deprecated: false, publishedAt: d.Time ?? null, license: null, weeklyDownloads: null };
  } catch { return EMPTY; }
}

// ── RubyGems ───────────────────────────────────────────────────────────────

async function fetchRubyGems(name: string): Promise<RegistryResult> {
  try {
    const res = await fetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`);
    if (!res.ok) return EMPTY;
    const d = await res.json();
    return { latest: d.version ?? '', deprecated: false, publishedAt: null, license: d.licenses?.[0] ?? null, weeklyDownloads: null };
  } catch { return EMPTY; }
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

export async function fetchLatestVersion(name: string, ecosystem: Ecosystem): Promise<RegistryResult> {
  switch (ecosystem) {
    case 'npm':      return fetchNpm(name);
    case 'pypi':     return fetchPypi(name);
    case 'cargo':    return fetchCargo(name);
    case 'go':       return fetchGo(name);
    case 'rubygems': return fetchRubyGems(name);
    default:         return EMPTY;
  }
}

// Batch with concurrency limit
export async function fetchLatestVersions<T extends { name: string; ecosystem: Ecosystem }>(
  deps: T[],
  concurrency = 6,
): Promise<(T & RegistryResult)[]> {
  const results: (T & RegistryResult)[] = [];
  for (let i = 0; i < deps.length; i += concurrency) {
    const batch = deps.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map(async (dep) => {
        const reg = await fetchLatestVersion(dep.name, dep.ecosystem);
        return { ...dep, ...reg };
      }),
    );
    results.push(...resolved);
  }
  return results;
}

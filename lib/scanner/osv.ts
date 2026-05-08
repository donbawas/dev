import type { Ecosystem } from './types';

const ECOSYSTEM_MAP: Record<Ecosystem, string> = {
  npm:      'npm',
  pypi:     'PyPI',
  cargo:    'crates.io',
  go:       'Go',
  rubygems: 'RubyGems',
};

export interface OsvResult {
  vulnCount: number;
  vulnSeverity: string | null;
  cveIds: string[];
}

export async function checkVulnerabilities(
  name: string,
  version: string,
  ecosystem: Ecosystem,
): Promise<OsvResult> {
  if (!version) return { vulnCount: 0, vulnSeverity: null, cveIds: [] };
  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version,
        package: { name, ecosystem: ECOSYSTEM_MAP[ecosystem] },
      }),
    });
    if (!res.ok) return { vulnCount: 0, vulnSeverity: null, cveIds: [] };
    const data = await res.json();
    const vulns: { id: string; aliases?: string[]; severity?: { type: string }[] }[] = data.vulns ?? [];
    if (vulns.length === 0) return { vulnCount: 0, vulnSeverity: null, cveIds: [] };

    const severities = vulns.flatMap((v) => v.severity?.map((s) => s.type) ?? []);
    const top = severities.includes('CRITICAL') ? 'CRITICAL'
      : severities.includes('HIGH') ? 'HIGH'
      : severities.includes('MODERATE') ? 'MODERATE'
      : 'LOW';

    // Collect CVE IDs from both the primary ID and aliases
    const cveIds = [...new Set(
      vulns.flatMap((v) => [v.id, ...(v.aliases ?? [])].filter((id) => id.startsWith('CVE-')))
    )];

    return { vulnCount: vulns.length, vulnSeverity: top, cveIds };
  } catch {
    return { vulnCount: 0, vulnSeverity: null, cveIds: [] };
  }
}

export async function checkVulnerabilitiesBatch<T extends { name: string; currentVersion: string; ecosystem: Ecosystem }>(
  deps: T[],
  concurrency = 4,
): Promise<(T & OsvResult)[]> {
  const results: (T & OsvResult)[] = [];
  for (let i = 0; i < deps.length; i += concurrency) {
    const batch = deps.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map(async (dep) => {
        const osv = await checkVulnerabilities(dep.name, dep.currentVersion, dep.ecosystem);
        return { ...dep, ...osv };
      }),
    );
    results.push(...resolved);
  }
  return results;
}

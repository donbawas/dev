import type { DepStatus } from './types';

export function classifyStatus(
  current: string,
  latest: string,
  deprecated: boolean,
  vulnCount: number,
): DepStatus {
  if (vulnCount > 0) return 'vulnerable';
  if (deprecated) return 'deprecated';
  if (!current || !latest) return 'up_to_date';

  try {
    // Strip leading 'v' (Go modules)
    const c = current.replace(/^v/, '').split('.').map(Number);
    const l = latest.replace(/^v/, '').split('.').map(Number);
    if (isNaN(c[0]) || isNaN(l[0])) return 'up_to_date';
    if (l[0] > c[0]) return 'major';
    if (l[1] > (c[1] ?? 0)) return 'minor';
    if ((l[2] ?? 0) > (c[2] ?? 0)) return 'patch';
    return 'up_to_date';
  } catch {
    return 'up_to_date';
  }
}

export function calcDaysBehind(publishedAt: string | null, status: DepStatus): number {
  if (!publishedAt || status === 'up_to_date') return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000));
}

export interface HealthInput {
  dep_count: number;
  vuln_count: number;
  outdated_count: number;
  deprecated_count: number;
  critical_count?: number;
  high_count?: number;
}

export function calcHealthScore(h: HealthInput): number {
  if (h.dep_count === 0) return 100;
  let score = 100;
  score -= (h.critical_count ?? 0) * 20;
  score -= (h.high_count ?? 0) * 12;
  score -= (h.vuln_count - (h.critical_count ?? 0) - (h.high_count ?? 0)) * 6;
  score -= Math.min(h.outdated_count, h.dep_count) * 4;
  score -= h.deprecated_count * 3;
  return Math.max(0, Math.round(score));
}

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number): HealthGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export const GRADE_COLORS: Record<HealthGrade, string> = {
  A: 'text-green-500',
  B: 'text-blue-500',
  C: 'text-amber-500',
  D: 'text-orange-500',
  F: 'text-destructive',
};

export const GRADE_BG: Record<HealthGrade, string> = {
  A: 'bg-green-500/10 border-green-500/30',
  B: 'bg-blue-500/10 border-blue-500/30',
  C: 'bg-amber-500/10 border-amber-500/30',
  D: 'bg-orange-500/10 border-orange-500/30',
  F: 'bg-destructive/10 border-destructive/30',
};

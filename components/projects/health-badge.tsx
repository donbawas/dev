import { calcHealthScore, scoreToGrade, GRADE_COLORS, GRADE_BG } from '@/lib/health';
import { cn } from '@/lib/utils';

interface Props {
  depCount: number;
  vulnCount: number;
  outdatedCount: number;
  deprecatedCount: number;
  size?: 'sm' | 'lg';
}

export function HealthBadge({ depCount, vulnCount, outdatedCount, deprecatedCount, size = 'sm' }: Props) {
  if (depCount === 0) return null;
  const score = calcHealthScore({ dep_count: depCount, vuln_count: vulnCount, outdated_count: outdatedCount, deprecated_count: deprecatedCount });
  const grade = scoreToGrade(score);

  if (size === 'lg') {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-xl border px-5 py-4', GRADE_BG[grade])}>
        <span className={cn('text-4xl font-bold', GRADE_COLORS[grade])}>{grade}</span>
        <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">Health score</span>
        <span className="text-xs font-semibold text-muted-foreground">{score}/100</span>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1', GRADE_BG[grade])}>
      <span className={cn('text-sm font-bold', GRADE_COLORS[grade])}>{grade}</span>
      <span className="text-[10px] text-muted-foreground">{score}</span>
    </div>
  );
}

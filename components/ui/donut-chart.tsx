'use client';

interface Slice { value: number; color: string; label: string }

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: React.ReactNode;
}

export function DonutChart({ slices, size = 80, thickness = 12, centerLabel }: Props) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const paths = slices.map((slice) => {
    const pct = slice.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const el = (
      <circle
        key={slice.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={slice.color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset * circumference}
        strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    );
    offset += pct;
    return el;
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} className="text-border" />
        {paths}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          {centerLabel}
        </div>
      )}
    </div>
  );
}

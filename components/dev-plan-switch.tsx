'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PLANS = ['free', 'pro', 'team'] as const;
type Plan = typeof PLANS[number];

export function DevPlanSwitch() {
  const [plan, setPlan] = useState<Plan>('free');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/plan').then((r) => r.json()).then((d) => setPlan(d.plan ?? 'free'));
  }, []);

  async function toggle(next: Plan) {
    if (next === plan || saving) return;
    setSaving(true);
    await fetch('/api/user/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: next }),
    });
    setPlan(next);
    setSaving(false);
    window.location.reload();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Dev · Plan</p>
      <div className="flex gap-1">
        {PLANS.map((p) => (
          <button
            key={p}
            onClick={() => toggle(p)}
            disabled={saving}
            className={cn(
              'rounded px-2 py-1 text-[10px] font-semibold capitalize transition-colors',
              plan === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

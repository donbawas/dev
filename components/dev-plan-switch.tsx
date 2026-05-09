'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PLANS = ['free', 'pro', 'team'] as const;
const ROLES = ['user', 'admin'] as const;
type Plan = typeof PLANS[number];
type Role = typeof ROLES[number];

export function DevPlanSwitch() {
  const [plan, setPlan] = useState<Plan>('free');
  const [role, setRole] = useState<Role>('user');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/user/plan').then((r) => r.json()).then((d) => {
      setPlan(d.plan ?? 'free');
      setRole(d.role ?? 'user');
    });
  }, []);

  async function switchPlan(next: Plan) {
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

  async function switchRole(next: Role) {
    if (next === role || saving) return;
    setSaving(true);
    await fetch('/api/user/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    });
    setRole(next);
    setSaving(false);
    window.location.reload();
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="flex flex-col gap-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Dev · Plan</p>
        <div className="flex gap-1">
          {PLANS.map((p) => (
            <button
              key={p}
              onClick={() => switchPlan(p)}
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
      <div className="flex flex-col gap-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Dev · Role</p>
        <div className="flex gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              disabled={saving}
              className={cn(
                'rounded px-2 py-1 text-[10px] font-semibold capitalize transition-colors',
                role === r
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

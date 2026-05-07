'use client';

import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'For individuals getting started',
    cta: 'Current plan',
    disabled: true,
    highlighted: false,
    features: [
      'Personalized dev feed',
      'Discover & subscribe to topics',
      'GitHub trending explorer',
      'Save updates',
      '5 topic subscriptions',
    ],
  },
  {
    name: 'Pro',
    price: 12,
    description: 'For developers who stay ahead',
    cta: 'Get started',
    disabled: false,
    highlighted: true,
    features: [
      'Everything in Free',
      'Unlimited topic subscriptions',
      '3 projects (dependency tracker)',
      'Vulnerability alerts',
      'SLA tracking per dependency',
      'Version timeline',
      'Email digest',
    ],
  },
  {
    name: 'Team',
    price: 29,
    description: 'For teams shipping fast',
    cta: 'Get started',
    disabled: false,
    highlighted: false,
    features: [
      'Everything in Pro',
      'Unlimited projects',
      'Team workspace & sharing',
      'SLA reports & exports',
      'Slack / webhook alerts',
      'Priority support',
      'Custom sources',
    ],
  },
];

export function PricingModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  function handleSelect(planName: string) {
    setLoading(planName);
    setTimeout(() => {
      setLoading(null);
      // TODO: integrate Stripe
      alert(`Stripe integration coming soon — you selected ${planName}`);
    }, 800);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-muted/30 px-8 py-6 text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <Zap className="size-4 text-primary" />
            <span className="text-sm font-semibold">DevPulse Pro</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Upgrade to unlock Projects
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Track your app's dependencies, vulnerabilities, and version SLAs in real time.
          </DialogDescription>
        </div>

        {/* Plans */}
        <div className="grid gap-0 sm:grid-cols-3">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col gap-5 p-6',
                plan.highlighted && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
                i < PLANS.length - 1 && 'border-r border-border',
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  Most popular
                </span>
              )}

              <div>
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="flex flex-1 flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? 'default' : 'outline'}
                disabled={plan.disabled || loading === plan.name}
                onClick={() => !plan.disabled && handleSelect(plan.name)}
                className="w-full"
              >
                {loading === plan.name ? 'Loading…' : plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="border-t border-border px-8 py-3 text-center text-[11px] text-muted-foreground">
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </DialogContent>
    </Dialog>
  );
}

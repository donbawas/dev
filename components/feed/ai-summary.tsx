'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SummaryData {
  headline: string;
  bullets: string[];
  breaking: boolean;
}

function parseSummary(raw: string): SummaryData {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.headline) return parsed as SummaryData;
  } catch {}
  return { headline: raw, bullets: [], breaking: false };
}

interface Props {
  updateId: number;
  initialSummary: string | null;
  isPro: boolean;
}

export function AISummary({ updateId, initialSummary, isPro }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/updates/${updateId}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // Summary exists — show it for everyone
  if (summary) {
    const { headline, bullets, breaking } = parseSummary(summary);
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">AI Summary</span>
          </div>
          {breaking && (
            <span className="flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400">
              <AlertTriangle className="size-2.5" /> Breaking changes
            </span>
          )}
        </div>

        {/* Headline */}
        <p className="text-sm font-medium leading-snug text-foreground">{headline}</p>

        {/* Bullets */}
        {bullets.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary/60" />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Pro user — show generate button
  if (isPro) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-2"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5 text-primary" />
          )}
          {loading ? 'Generating summary…' : 'Summarize with AI'}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Free user — locked hint
  return (
    <button
      className={cn(
        'flex w-fit items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground',
      )}
      disabled
    >
      <Lock className="size-3 text-muted-foreground/60" />
      AI summaries — Pro feature
    </button>
  );
}

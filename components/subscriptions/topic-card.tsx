'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/date';
import { SOURCE_TYPE_LABELS } from '@/lib/types';
import type { Topic } from '@/lib/types';
import { cn } from '@/lib/utils';

const SOURCE_TYPE_COLORS: Record<string, string> = {
  github:      'bg-neutral-800 text-neutral-200 dark:bg-neutral-700',
  npm:         'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  rss:         'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  url:         'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  pypi:        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  huggingface: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

interface Props {
  topic: Topic & { last_update_at?: string | null };
  subscribed: boolean;
  onToggle: (topicId: number, subscribed: boolean) => Promise<void>;
}

export function TopicCard({ topic, subscribed, onToggle }: Props) {
  const lastUpdated = topic.last_update_at ? formatDistanceToNow(new Date(topic.last_update_at)) : null;
  const [loading, setLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(subscribed);

  async function handleToggle() {
    setLoading(true);
    setIsSubscribed((prev) => !prev); // optimistic
    try {
      await onToggle(topic.id, isSubscribed);
    } catch {
      setIsSubscribed((prev) => !prev); // revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-colors',
        isSubscribed
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-card-foreground">{topic.name}</span>
            {topic.verified && (
              <CheckCircle2 className="size-3.5 shrink-0 text-primary" aria-label="Verified" />
            )}
          </div>
          {topic.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{topic.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', SOURCE_TYPE_COLORS[topic.source_type])}>
          {SOURCE_TYPE_LABELS[topic.source_type]}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">{topic.source_identifier}</span>
      </div>
      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground/60">Updated {lastUpdated}</p>
      )}

      <Button
        size="sm"
        variant={isSubscribed ? 'secondary' : 'default'}
        className="mt-auto w-full"
        onClick={handleToggle}
        disabled={loading}
      >
        {isSubscribed ? 'Subscribed ✓' : 'Subscribe'}
      </Button>
    </div>
  );
}

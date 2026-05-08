'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SOURCE_TYPE_LABELS } from '@/lib/types';
import type { SourceType } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';

export interface SubscribedTopic {
  id: number;
  name: string;
  slug: string;
  verified: boolean;
  source_type: SourceType;
  source_identifier: string;
  category_name: string;
  last_update_at: string | null;
  new_count: number;
}

interface Props { initialTopics: SubscribedTopic[] }

export function SubscribedList({ initialTopics }: Props) {
  const [topics, setTopics] = useState(initialTopics);
  const [removing, setRemoving] = useState<number | null>(null);

  async function unsubscribe(topicId: number) {
    setRemoving(topicId);
    await fetch(`/api/subscriptions/${topicId}`, { method: 'DELETE' });
    setTopics((prev) => prev.filter((t) => t.id !== topicId));
    setRemoving(null);
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-sm font-medium text-foreground">You're not following anything yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Head to Discover to find topics to subscribe to.</p>
        <Button asChild size="sm" className="mt-4"><Link href="/discover">Browse topics</Link></Button>
      </div>
    );
  }

  const byCategory = topics.reduce<Record<string, SubscribedTopic[]>>((acc, t) => {
    (acc[t.category_name] ??= []).push(t);
    return acc;
  }, {});
  const categories = Object.keys(byCategory).sort();

  return (
    <Tabs defaultValue={categories[0]}>
      <TabsList className="flex-wrap justify-start">
        {categories.map((cat) => {
          const newTotal = byCategory[cat].reduce((s, t) => s + (t.new_count ?? 0), 0);
          return (
            <TabsTrigger key={cat} value={cat} className="gap-1.5">
              {cat}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {byCategory[cat].length}
              </span>
              {newTotal > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {newTotal} new
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {categories.map((cat) => (
        <TabsContent key={cat} value={cat} className="mt-4">
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
            {byCategory[cat].map((topic) => (
              <div key={topic.id} className="flex items-center gap-3 bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex flex-1 min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{topic.name}</span>
                  {topic.verified && <CheckCircle2 className="size-3.5 shrink-0 text-primary" />}
                  {topic.new_count > 0 && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {topic.new_count} new
                    </span>
                  )}
                </div>

                <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                  {SOURCE_TYPE_LABELS[topic.source_type]}
                </span>
                <span className="hidden truncate text-[11px] text-muted-foreground md:block max-w-[160px]">
                  {topic.source_identifier}
                </span>
                {topic.last_update_at ? (
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:block">
                    {formatDistanceToNow(new Date(topic.last_update_at))}
                  </span>
                ) : (
                  <span className="hidden shrink-0 text-[11px] text-muted-foreground/40 lg:block">no updates</span>
                )}

                <Button
                  variant="ghost" size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={removing === topic.id}
                  onClick={() => unsubscribe(topic.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

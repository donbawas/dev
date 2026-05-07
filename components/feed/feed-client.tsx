'use client';

import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UPDATE_TYPE_LABELS, UPDATE_TYPE_COLORS, SOURCE_TYPE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { FeedUpdate } from '@/app/(main)/feed/page';

interface Props {
  updates: FeedUpdate[];
}

export function FeedClient({ updates }: Props) {
  const byCategory = updates.reduce<Record<string, FeedUpdate[]>>((acc, u) => {
    (acc[u.category_name] ??= []).push(u);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-sm font-medium text-foreground">No updates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Check back soon.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="all">
      <TabsList className="flex-wrap justify-start">
        <TabsTrigger value="all" className="gap-1.5">
          All
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {updates.length}
          </span>
        </TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat} className="gap-1.5">
            {cat}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {byCategory[cat].length}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <UpdateList updates={updates} />
      </TabsContent>

      {categories.map((cat) => (
        <TabsContent key={cat} value={cat} className="mt-4">
          <UpdateList updates={byCategory[cat]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function UpdateList({ updates }: { updates: FeedUpdate[] }) {
  return (
    <div className="flex flex-col gap-3">
      {updates.map((u) => <UpdateCard key={u.id} update={u} />)}
    </div>
  );
}

function UpdateCard({ update }: { update: FeedUpdate }) {
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[update.update_type])}>
          {UPDATE_TYPE_LABELS[update.update_type]}
        </span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-foreground">
          {update.topic_name}
          {update.topic_verified && <CheckCircle2 className="size-2.5 text-primary" />}
        </span>
        {timeAgo && <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo}</span>}
      </div>

      <div>
        <p className="text-sm font-semibold leading-snug text-card-foreground">{update.title}</p>
        {update.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {update.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10px] text-muted-foreground">{SOURCE_TYPE_LABELS[update.source_type]}</span>
        <div className="flex items-center gap-3">
          {update.url && (
            <a
              href={update.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Source <ExternalLink className="size-3" />
            </a>
          )}
          <Link
            href={`/feed/${update.id}`}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Details <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

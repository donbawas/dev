'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, ArrowRight, CheckCircle2, Bookmark, BookmarkCheck } from 'lucide-react';
import { UPDATE_TYPE_LABELS, UPDATE_TYPE_COLORS, SOURCE_TYPE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { FeedUpdate } from '@/app/(main)/feed/page';

const UPDATE_BORDER: Record<string, string> = {
  release:      'border-l-green-500',
  announcement: 'border-l-blue-500',
  security:     'border-l-destructive',
  article:      'border-l-purple-500',
  discussion:   'border-l-amber-500',
  other:        'border-l-border',
};

const TYPE_FILTERS = [
  { value: 'all',          label: 'All'           },
  { value: 'release',      label: 'Releases'      },
  { value: 'security',     label: 'Security'      },
  { value: 'announcement', label: 'Announcements' },
  { value: 'discussion',   label: 'Discussions'   },
  { value: 'article',      label: 'Articles'      },
];

const LAST_VISIT_KEY = 'devpulse_last_feed_visit';

interface Props {
  updates: FeedUpdate[];
  initialSavedIds: number[];
}

export function FeedClient({ updates, initialSavedIds }: Props) {
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set(initialSavedIds));
  const [typeFilter, setTypeFilter] = useState('all');
  const [lastVisit, setLastVisit] = useState<Date | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_VISIT_KEY);
    if (stored) setLastVisit(new Date(stored));
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }, []);

  const toggleSave = useCallback(async (updateId: number, isSaved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(updateId) : next.add(updateId);
      return next;
    });
    if (isSaved) {
      await fetch(`/api/saved/${updateId}`, { method: 'DELETE' });
    } else {
      await fetch('/api/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ update_id: updateId }) });
    }
  }, []);

  const byCategory = updates.reduce<Record<string, FeedUpdate[]>>((acc, u) => {
    (acc[u.category_name] ??= []).push(u);
    return acc;
  }, {});
  const categories = Object.keys(byCategory).sort();

  const applyFilter = (list: FeedUpdate[]) =>
    typeFilter === 'all' ? list : list.filter((u) => u.update_type === typeFilter);

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <p className="text-sm font-medium">No updates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Type filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              typeFilter === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap justify-start">
          <TabsTrigger value="all" className="gap-1.5">
            All <CountBadge count={applyFilter(updates).length} />
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="gap-1.5">
              {cat} <CountBadge count={applyFilter(byCategory[cat]).length} />
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UpdateList updates={applyFilter(updates)} savedIds={savedIds} lastVisit={lastVisit} onToggleSave={toggleSave} />
        </TabsContent>
        {categories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <UpdateList updates={applyFilter(byCategory[cat])} savedIds={savedIds} lastVisit={lastVisit} onToggleSave={toggleSave} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {count}
    </span>
  );
}

function UpdateList({ updates, savedIds, lastVisit, onToggleSave }: {
  updates: FeedUpdate[];
  savedIds: Set<number>;
  lastVisit: Date | null;
  onToggleSave: (id: number, saved: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {updates.map((u) => (
        <UpdateCard
          key={u.id}
          update={u}
          isSaved={savedIds.has(u.id)}
          isUnread={lastVisit != null && u.published_at != null && new Date(u.published_at) > lastVisit}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
}

function UpdateCard({ update, isSaved, isUnread, onToggleSave }: {
  update: FeedUpdate;
  isSaved: boolean;
  isUnread: boolean;
  onToggleSave: (id: number, saved: boolean) => void;
}) {
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;
  const borderColor = UPDATE_BORDER[update.update_type] ?? UPDATE_BORDER.other;

  return (
    <article className={cn(
      'flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 transition-colors hover:bg-muted/30',
      borderColor,
      isUnread && 'bg-primary/[0.03]',
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[update.update_type])}>
          {UPDATE_TYPE_LABELS[update.update_type]}
        </span>
        {isUnread && <span className="size-1.5 rounded-full bg-primary" />}
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
          <button
            onClick={() => onToggleSave(update.id, isSaved)}
            className={cn('transition-colors', isSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          </button>
          {update.url && (
            <a href={update.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              Source <ExternalLink className="size-3" />
            </a>
          )}
          <Link href={`/feed/${update.id}`}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
            Details <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, CheckCircle2, Bookmark, BookmarkCheck } from 'lucide-react';
import { UPDATE_TYPE_LABELS, UPDATE_TYPE_COLORS, SOURCE_TYPE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { FeedUpdate } from '@/app/(main)/feed/page';

const UPDATE_BORDER: Record<string, string> = {
  release:      'border-l-green-500',
  announcement: 'border-l-blue-500',
  security:     'border-l-red-500',
  article:      'border-l-purple-500',
  discussion:   'border-l-amber-500',
  other:        'border-l-border',
};

const ALL_TYPE_FILTERS = [
  { value: 'release',      label: 'Releases'      },
  { value: 'security',     label: 'Security'      },
  { value: 'announcement', label: 'Announcements' },
  { value: 'article',      label: 'Articles'      },
  { value: 'discussion',   label: 'Discussions'   },
  { value: 'other',        label: 'Other'         },
];

const LAST_VISIT_KEY = 'devpulse_last_feed_visit';

function getGithubOrg(sourceType: string, sourceIdentifier: string): string | null {
  if (sourceType !== 'github') return null;
  return sourceIdentifier.split('/')[0] ?? null;
}

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

  const toggleSave = useCallback(async (e: React.MouseEvent, updateId: number, isSaved: boolean) => {
    e.preventDefault();
    e.stopPropagation();
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

  const presentTypes = new Set(updates.map((u) => u.update_type));
  const activeTypeFilters = ALL_TYPE_FILTERS.filter((f) => presentTypes.has(f.value as never));

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
      {/* Type filter pills — only show types that have results */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter('all')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            typeFilter === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          All
        </button>
        {activeTypeFilters.map((f) => (
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
  onToggleSave: (e: React.MouseEvent, id: number, saved: boolean) => void;
}) {
  if (updates.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No updates in this category.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
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
  onToggleSave: (e: React.MouseEvent, id: number, saved: boolean) => void;
}) {
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;
  const borderColor = UPDATE_BORDER[update.update_type] ?? UPDATE_BORDER.other;
  const org = getGithubOrg(update.source_type, update.source_identifier ?? '');

  return (
    <Link
      href={`/feed/${update.id}`}
      className={cn(
        'group flex gap-3 rounded-xl border border-l-4 bg-card p-4 transition-all hover:bg-muted/40 hover:shadow-sm',
        borderColor,
        isUnread && 'bg-primary/[0.03]',
      )}
    >
      {/* Source avatar */}
      {org ? (
        <div className="mt-0.5 shrink-0">
          <Image
            src={`https://avatars.githubusercontent.com/${org}`}
            alt={org}
            width={36}
            height={36}
            className="rounded-lg border border-border/50"
          />
        </div>
      ) : (
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold uppercase text-muted-foreground">
          {SOURCE_TYPE_LABELS[update.source_type]?.slice(0, 2)}
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[update.update_type])}>
            {UPDATE_TYPE_LABELS[update.update_type]}
          </span>
          {isUnread && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
              New
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            {update.topic_name}
            {update.topic_verified && <CheckCircle2 className="size-2.5 text-primary" />}
          </span>
          {timeAgo && <span className="ml-auto shrink-0 tabular-nums text-[10px] text-muted-foreground">{timeAgo}</span>}
        </div>

        <p className="text-sm font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
          {update.title}
        </p>

        {update.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {update.description}
          </p>
        )}

        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-[10px] text-muted-foreground/60">{update.category_name}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={(e) => onToggleSave(e, update.id, isSaved)}
              className={cn(
                'rounded p-1 transition-colors',
                isSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              {isSaved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            </button>
            {update.url && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(update.url!, '_blank', 'noopener,noreferrer'); }}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Open source"
              >
                <ExternalLink className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

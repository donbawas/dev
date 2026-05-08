'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, ExternalLink, ArrowRight, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UPDATE_TYPE_LABELS, UPDATE_TYPE_COLORS, SOURCE_TYPE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { UpdateType, SourceType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const UPDATE_BORDER: Record<string, string> = {
  release: 'border-l-green-500', announcement: 'border-l-blue-500',
  security: 'border-l-destructive', article: 'border-l-purple-500',
  discussion: 'border-l-amber-500', other: 'border-l-border',
};

interface SavedUpdate {
  saved_id: number;
  saved_at: string;
  id: number;
  title: string;
  url: string | null;
  description: string | null;
  update_type: UpdateType;
  published_at: string | null;
  topic_name: string;
  topic_verified: boolean;
  source_type: SourceType;
  category_name: string;
}

export default function SavedPage() {
  const [items, setItems] = useState<SavedUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/saved').then((r) => r.json()).then((d) => {
      setItems(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  async function remove(savedId: number, updateId: number) {
    setItems((prev) => prev.filter((i) => i.saved_id !== savedId));
    await fetch(`/api/saved/${updateId}`, { method: 'DELETE' });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Saved</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : items.length === 0 ? 'No saved items yet' : `${items.length} saved item${items.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={async () => {
            for (const item of items) await fetch(`/api/saved/${item.id}`, { method: 'DELETE' });
            setItems([]);
          }}>
            Clear all
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-l-4 border-border bg-card p-4">
              <div className="flex gap-2"><Skeleton className="h-4 w-14" /><Skeleton className="h-3 w-24 ml-auto" /></div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <Bookmark className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Nothing saved yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bookmark updates from your feed to find them here.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/feed">Go to feed</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <article
              key={item.saved_id}
              className={cn('flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 transition-colors hover:bg-muted/30', UPDATE_BORDER[item.update_type] ?? UPDATE_BORDER.other)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[item.update_type])}>
                  {UPDATE_TYPE_LABELS[item.update_type]}
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-foreground">
                  {item.topic_name}
                  {item.topic_verified && <CheckCircle2 className="size-2.5 text-primary" />}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Saved {formatDistanceToNow(new Date(item.saved_at))}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold leading-snug text-card-foreground">{item.title}</p>
                {item.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground">{SOURCE_TYPE_LABELS[item.source_type]}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => remove(item.saved_id, item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                      Source <ExternalLink className="size-3" />
                    </a>
                  )}
                  <Link href={`/feed/${item.id}`} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                    Details <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

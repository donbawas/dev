import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, CheckCircle2, Calendar, Tag } from 'lucide-react';
import {
  SOURCE_TYPE_LABELS,
  UPDATE_TYPE_LABELS,
  UPDATE_TYPE_COLORS,
} from '@/lib/types';
import type { SourceType, UpdateType } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import { SaveButton } from '@/components/feed/save-button';

interface UpdateDetail {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
  update_type: UpdateType;
  published_at: string | null;
  topic_id: number;
  topic_name: string;
  topic_verified: boolean;
  topic_slug: string;
  source_type: SourceType;
  source_identifier: string;
  category_name: string;
}

interface RelatedUpdate {
  id: number;
  title: string;
  update_type: UpdateType;
  published_at: string | null;
}

export default async function UpdateDetailPage(props: PageProps<'/feed/[id]'>) {
  const { id } = await props.params;
  const { userId: clerkId } = await auth();

  const [update] = (await sql`
    SELECT
      u.id, u.title, u.url, u.description, u.update_type, u.published_at, u.topic_id,
      t.name             AS topic_name,
      t.verified         AS topic_verified,
      t.slug             AS topic_slug,
      t.source_type,
      t.source_identifier,
      c.name             AS category_name
    FROM updates u
    JOIN topics t ON t.id = u.topic_id
    JOIN categories c ON c.id = t.category_id
    WHERE u.id = ${Number(id)}
  `) as UpdateDetail[];

  if (!update) notFound();

  let isSaved = false;
  if (clerkId) {
    const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
    if (user) {
      const [saved] = await sql`SELECT 1 FROM saved_updates WHERE user_id = ${user.id} AND update_id = ${update.id}`;
      isSaved = !!saved;
    }
  }

  const related = (await sql`
    SELECT id, title, update_type, published_at
    FROM updates
    WHERE topic_id = ${update.topic_id} AND id <> ${update.id}
    ORDER BY COALESCE(published_at, created_at) DESC
    LIMIT 4
  `) as RelatedUpdate[];

  const publishedDate = update.published_at
    ? new Date(update.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      {/* Back */}
      <Link
        href="/feed"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to feed
      </Link>

      <article className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{update.category_name}</span>
          <span>/</span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            {update.topic_name}
            {update.topic_verified && <CheckCircle2 className="size-3 text-primary" />}
          </span>
        </div>

        {/* Type + date */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', UPDATE_TYPE_COLORS[update.update_type])}>
            {UPDATE_TYPE_LABELS[update.update_type]}
          </span>
          {publishedDate && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3.5" />
              {publishedDate}
              {timeAgo && <span className="text-muted-foreground/60">({timeAgo})</span>}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="size-3.5" />
            {SOURCE_TYPE_LABELS[update.source_type]}
            <span className="font-mono text-[11px]">{update.source_identifier}</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground">
          {update.title}
        </h1>

        {/* Summary */}
        {update.description ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</p>
            <p className="text-sm leading-relaxed text-foreground">{update.description}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No summary available.</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {update.url && (
            <a href={update.url} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                View source <ExternalLink className="size-4" />
              </Button>
            </a>
          )}
          {clerkId && <SaveButton updateId={update.id} initialSaved={isSaved} />}
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            More from {update.topic_name}
          </p>
          <div className="flex flex-col gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/feed/${r.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[r.update_type])}>
                  {UPDATE_TYPE_LABELS[r.update_type]}
                </span>
                <span className="flex-1 truncate text-foreground">{r.title}</span>
                {r.published_at && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.published_at))}
                  </span>
                )}
                <ArrowLeft className="size-3.5 shrink-0 rotate-180 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import {
  SOURCE_TYPE_LABELS,
  UPDATE_TYPE_LABELS,
  UPDATE_TYPE_COLORS,
} from '@/lib/types';
import type { SourceType, UpdateType } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';
import { SaveButton } from '@/components/feed/save-button';
import { AISummary } from '@/components/feed/ai-summary';

interface UpdateDetail {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
  ai_summary: string | null;
  reactions_count: number;
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

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Frameworks':        'from-blue-600 to-indigo-700',
  'AI Models':         'from-violet-600 to-purple-700',
  'Languages':         'from-emerald-600 to-teal-700',
  'Cloud & DevOps':    'from-orange-500 to-amber-600',
  'Tools & Libraries': 'from-rose-500 to-pink-600',
};

function getGradient(category: string) {
  return CATEGORY_GRADIENTS[category] ?? 'from-neutral-600 to-neutral-700';
}

function getGithubOrg(sourceType: SourceType, sourceIdentifier: string): string | null {
  if (sourceType !== 'github') return null;
  return sourceIdentifier.split('/')[0] ?? null;
}

function renderDescription(text: string) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length <= 1) {
    return <p className="text-sm leading-relaxed text-foreground">{text}</p>;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-foreground">{p.trim()}</p>
      ))}
    </>
  );
}

type PageProps<T extends string> = {
  params: Promise<Record<string, string>>;
};

export default async function UpdateDetailPage(props: PageProps<'/feed/[id]'>) {
  const { id } = await props.params;
  const { userId: clerkId } = await auth();

  const [update] = (await sql`
    SELECT
      u.id, u.title, u.url, u.description, u.ai_summary, u.reactions_count, u.update_type, u.published_at, u.topic_id,
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
  let isPro = false;
  if (clerkId) {
    const [user] = await sql`SELECT id, plan FROM users WHERE clerk_id = ${clerkId}`;
    if (user) {
      isPro = user.plan !== 'free';
      const [saved] = await sql`SELECT 1 FROM saved_updates WHERE user_id = ${user.id} AND update_id = ${update.id}`;
      isSaved = !!saved;
    }
  }

  const [relatedRaw, prevUpdate] = await Promise.all([
    sql`
      SELECT id, title, update_type, published_at
      FROM updates
      WHERE topic_id = ${update.topic_id} AND id <> ${update.id}
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 4
    `,
    sql`
      SELECT url FROM updates
      WHERE topic_id = ${update.topic_id}
        AND id <> ${update.id}
        AND COALESCE(published_at, created_at) < COALESCE(${update.published_at}, NOW())
      ORDER BY COALESCE(published_at, created_at) DESC
      LIMIT 1
    `,
  ]);
  const related = relatedRaw as RelatedUpdate[];

  // Build compare URL for GitHub releases: .../releases/tag/v1.2.0 → extract tag
  function extractTag(url: string | null): string | null {
    if (!url) return null;
    const match = url.match(/\/releases\/tag\/(.+)$/);
    return match?.[1] ?? null;
  }

  const currentTag = extractTag(update.url);
  const prevTag = extractTag((prevUpdate[0] as { url: string } | undefined)?.url ?? null);
  const compareUrl = currentTag && prevTag && update.source_type === 'github'
    ? `https://github.com/${update.source_identifier}/compare/${prevTag}...${currentTag}`
    : null;

  const org = getGithubOrg(update.source_type, update.source_identifier);
  const publishedDate = update.published_at
    ? new Date(update.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;
  const isSecurity = update.update_type === 'security';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pb-16">
      {/* Back */}
      <div className="px-6 pt-4">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Feed
        </Link>
      </div>

      {/* Visual header */}
      <div className={cn('relative mx-6 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white', getGradient(update.category_name))}>
        {org && (
          <div className="absolute right-6 top-6 opacity-15">
            <Image
              src={`https://avatars.githubusercontent.com/${org}`}
              alt={org}
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
        )}
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">
              {UPDATE_TYPE_LABELS[update.update_type]}
            </span>
            <span className="text-xs text-white/70">{update.category_name}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-white/80">{update.topic_name}</p>
              {update.topic_verified && <CheckCircle2 className="size-3 text-white/60" />}
            </div>
            <h1 className="mt-1 text-xl font-bold leading-snug tracking-tight md:text-2xl">
              {update.title}
            </h1>
          </div>
          {publishedDate && (
            <p className="text-xs text-white/60">
              {publishedDate}{timeAgo ? ` · ${timeAgo}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 px-6 pt-6">

        {/* Security callout */}
        {isSecurity && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-500" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">Security advisory</p>
              <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
                Review and apply this update promptly. Check the source for CVE details and affected versions.
              </p>
            </div>
          </div>
        )}

        {/* AI Summary */}
        <AISummary updateId={update.id} initialSummary={update.ai_summary} isPro={isPro} />

        {/* Description */}
        {update.description ? (
          <div className="flex flex-col gap-3">
            {renderDescription(update.description)}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">No summary available for this update.</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>{SOURCE_TYPE_LABELS[update.source_type]}</span>
          <span className="font-mono">{update.source_identifier}</span>
          {publishedDate && <span>{publishedDate}</span>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {update.url && (
            <a href={update.url} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                View source <ExternalLink className="size-4" />
              </Button>
            </a>
          )}
          {compareUrl && (
            <a href={compareUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                Compare changes <ExternalLink className="size-4" />
              </Button>
            </a>
          )}
          {clerkId && <SaveButton updateId={update.id} initialSaved={isSaved} />}
          {update.reactions_count > 0 && (
            <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              🚀 <span className="tabular-nums font-medium">{update.reactions_count}</span>
              <span className="text-xs">reactions on GitHub</span>
            </span>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-6 mt-10 flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            More from {update.topic_name}
          </p>
          <div className="flex flex-col gap-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/feed/${r.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-border/80 hover:bg-muted/40 hover:shadow-sm"
              >
                <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[r.update_type])}>
                  {UPDATE_TYPE_LABELS[r.update_type]}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">{r.title}</span>
                {r.published_at && (
                  <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.published_at))}
                  </span>
                )}
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

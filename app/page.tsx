import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ExternalLink, TrendingUp, Zap } from 'lucide-react';
import { SignUpButton, Show } from '@clerk/nextjs';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { sql } from '@/lib/db';
import { UPDATE_TYPE_LABELS, UPDATE_TYPE_COLORS, SOURCE_TYPE_LABELS } from '@/lib/types';
import type { UpdateType, SourceType } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';

interface PublicUpdate {
  id: number;
  title: string;
  url: string | null;
  description: string | null;
  update_type: UpdateType;
  published_at: string | null;
  topic_name: string;
  topic_verified: boolean;
  source_type: SourceType;
  source_identifier: string;
  category_name: string;
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
  const org = sourceIdentifier.split('/')[0];
  return org ?? null;
}

interface TrendingTopic {
  id: number; name: string; slug: string; category_name: string;
  subscriber_count: number; update_count: number;
}

export default async function HomePage() {
  const [updates, trending] = await Promise.all([
    sql`
      SELECT
        u.id, u.title, u.url, u.description, u.update_type, u.published_at,
        t.name AS topic_name, t.verified AS topic_verified,
        t.source_type, t.source_identifier, c.name AS category_name
      FROM updates u
      JOIN topics t ON t.id = u.topic_id
      JOIN categories c ON c.id = t.category_id
      WHERE t.verified = true
      ORDER BY COALESCE(u.published_at, u.created_at) DESC
      LIMIT 13
    `,
    sql`
      SELECT t.id, t.name, t.slug, c.name AS category_name,
        COUNT(DISTINCT us.user_id)::int  AS subscriber_count,
        COUNT(DISTINCT u.id)::int        AS update_count
      FROM topics t
      JOIN categories c ON c.id = t.category_id
      LEFT JOIN user_subscriptions us ON us.topic_id = t.id
      LEFT JOIN updates u ON u.topic_id = t.id
      WHERE t.verified = true
      GROUP BY t.id, t.name, t.slug, c.name
      ORDER BY subscriber_count DESC, update_count DESC
      LIMIT 10
    `,
  ]);

  const allUpdates = updates as PublicUpdate[];
  const [hero, ...rest] = allUpdates;
  const featured = rest.slice(0, 3);
  const grid = rest.slice(3);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="flex flex-1 flex-col">
        {/* ── Empty state ── */}
        {allUpdates.length === 0 && (
          <section className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-32 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <TrendingUp className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No updates yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Check back soon — the feed updates hourly.</p>
            </div>
          </section>
        )}

        {/* ── Hero ── */}
        {hero && (
          <section className="border-b border-border px-6 py-8">
            <div className="mx-auto max-w-6xl">
              <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br p-8 text-white md:p-12', getGradient(hero.category_name))}>
                {/* GitHub org avatar */}
                {getGithubOrg(hero.source_type, hero.source_identifier) && (
                  <div className="absolute right-8 top-8 opacity-20">
                    <Image
                      src={`https://avatars.githubusercontent.com/${getGithubOrg(hero.source_type, hero.source_identifier)}`}
                      alt=""
                      width={120}
                      height={120}
                      className="rounded-full"
                    />
                  </div>
                )}

                <div className="relative flex flex-col gap-4 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                      {UPDATE_TYPE_LABELS[hero.update_type]}
                    </span>
                    <span className="text-xs text-white/70">{hero.category_name}</span>
                    <span className="text-xs text-white/70">·</span>
                    <span className="text-xs text-white/70">
                      {hero.published_at ? formatDistanceToNow(new Date(hero.published_at)) : ''}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-medium text-white/80">{hero.topic_name}</p>
                    <h1 className="text-2xl font-bold leading-snug tracking-tight md:text-3xl">
                      {hero.title}
                    </h1>
                    {hero.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/80">
                        {hero.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/feed/${hero.id}`}>
                      <Button className="gap-2 bg-white text-neutral-900 hover:bg-white/90">
                        Read more <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                    {hero.url && (
                      <a href={hero.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white">
                          Source <ExternalLink className="size-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Featured row ── */}
        {featured.length > 0 && (
          <section className="border-b border-border px-6 py-8">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Latest
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {featured.map((u) => <FeaturedCard key={u.id} update={u} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── News grid ── */}
        {grid.length > 0 && (
          <section className="px-6 py-8">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                More updates
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((u) => <GridCard key={u.id} update={u} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── Trending topics ── */}
        {(trending as TrendingTopic[]).length > 0 && (
          <section className="border-t border-border px-6 py-8">
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trending topics
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(trending as TrendingTopic[]).map((t) => (
                  <Link key={t.id} href="/discover">
                    <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted">
                      {t.name}
                      <span className="text-[10px] text-muted-foreground">{t.category_name}</span>
                      {t.subscriber_count > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[9px] font-semibold text-primary">
                          {t.subscriber_count} following
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CTA ── */}
        <Show when="signed-out">
          <section className="border-t border-border px-6 py-16 text-center">
            <div className="mx-auto max-w-lg">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                <Zap className="size-3" /> Free to get started
              </div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                Your personalized dev feed
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Subscribe to the frameworks, AI models, and tools you use. Get security alerts, release notes, and community updates in one place.
              </p>
              <SignUpButton mode="redirect">
                <Button size="lg" className="gap-2">
                  Get started free <ArrowRight className="size-4" />
                </Button>
              </SignUpButton>
            </div>
          </section>
        </Show>
      </main>

      <Footer />
    </div>
  );
}

function FeaturedCard({ update }: { update: PublicUpdate }) {
  const org = getGithubOrg(update.source_type, update.source_identifier);
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;

  return (
    <Link href={`/feed/${update.id}`} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-border/80 hover:shadow-md">
      {/* Color bar + avatar */}
      <div className={cn('relative flex h-24 items-end bg-gradient-to-br p-4', getGradient(update.category_name))}>
        {org && (
          <Image
            src={`https://avatars.githubusercontent.com/${org}`}
            alt={org}
            width={48}
            height={48}
            className="rounded-xl border-2 border-white/30 shadow-md"
          />
        )}
        <span className={cn('absolute right-3 top-3 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/20 text-white backdrop-blur')}>
          {UPDATE_TYPE_LABELS[update.update_type]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[10px] font-medium text-muted-foreground">
          {update.topic_name} · {timeAgo}
        </p>
        <p className="text-sm font-semibold leading-snug text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {update.title}
        </p>
        {update.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {update.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function GridCard({ update }: { update: PublicUpdate }) {
  const timeAgo = update.published_at ? formatDistanceToNow(new Date(update.published_at)) : null;

  return (
    <Link
      href={`/feed/${update.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-border/80 hover:bg-muted/50 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', UPDATE_TYPE_COLORS[update.update_type])}>
          {UPDATE_TYPE_LABELS[update.update_type]}
        </span>
        <span className="text-[10px] text-muted-foreground">{update.category_name}</span>
        {timeAgo && <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{timeAgo}</span>}
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary">
        {update.title}
      </p>
      <p className="text-[10px] text-muted-foreground">{update.topic_name} · {SOURCE_TYPE_LABELS[update.source_type]}</p>
    </Link>
  );
}

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { FeedClient } from '@/components/feed/feed-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { SourceType, UpdateType } from '@/lib/types';

export interface FeedUpdate {
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

export default async function FeedPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return <EmptyShell><EmptyNoSubscriptions /></EmptyShell>;

  const subCount = await sql`SELECT COUNT(*) FROM user_subscriptions WHERE user_id = ${user.id}`;
  if (Number(subCount[0].count) === 0) return <EmptyShell><EmptyNoSubscriptions /></EmptyShell>;

  const [updates, savedRows] = await Promise.all([
    sql`
      SELECT
        u.id, u.title, u.url, u.description, u.update_type, u.published_at,
        t.name             AS topic_name,
        t.verified         AS topic_verified,
        t.source_type,
        t.source_identifier,
        c.name             AS category_name
      FROM updates u
      JOIN topics t ON t.id = u.topic_id
      JOIN categories c ON c.id = t.category_id
      JOIN user_subscriptions us ON us.topic_id = t.id AND us.user_id = ${user.id}
      ORDER BY COALESCE(u.published_at, u.created_at) DESC
      LIMIT 100
    `,
    sql`SELECT update_id FROM saved_updates WHERE user_id = ${user.id}`,
  ]);

  const savedIds = savedRows.map((r) => (r as { update_id: number }).update_id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Feed</h1>
        <p className="text-sm text-muted-foreground">Latest updates from your subscriptions</p>
      </div>
      <FeedClient updates={updates as FeedUpdate[]} initialSavedIds={savedIds} />
    </div>
  );
}

function EmptyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Feed</h1>
        <p className="text-sm text-muted-foreground">Latest updates from your subscriptions</p>
      </div>
      {children}
    </div>
  );
}

function EmptyNoSubscriptions() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
      <Bell className="mb-3 size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">Your feed is empty</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Subscribe to topics to start seeing updates here.
      </p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/discover">Browse topics</Link>
      </Button>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-l-4 border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="ml-auto h-3 w-10 rounded" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

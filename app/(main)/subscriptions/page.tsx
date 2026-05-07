import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { SubscribedList } from '@/components/subscriptions/subscribed-list';
import type { SubscribedTopic } from '@/components/subscriptions/subscribed-list';

export default async function SubscriptionsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;

  if (!user) {
    return (
      <div className="flex flex-col gap-6">
        <Header count={0} />
        <SubscribedList initialTopics={[]} />
      </div>
    );
  }

  const topics = (await sql`
    SELECT
      t.id, t.name, t.slug, t.verified, t.source_type, t.source_identifier,
      c.name AS category_name,
      MAX(COALESCE(u.published_at, u.created_at)) AS last_update_at
    FROM user_subscriptions us
    JOIN topics t ON t.id = us.topic_id
    JOIN categories c ON c.id = t.category_id
    LEFT JOIN updates u ON u.topic_id = t.id
    WHERE us.user_id = ${user.id}
    GROUP BY t.id, t.name, t.slug, t.verified, t.source_type, t.source_identifier, c.name
    ORDER BY c.name, t.name
  `) as SubscribedTopic[];

  return (
    <div className="flex flex-col gap-6">
      <Header count={topics.length} />
      <SubscribedList initialTopics={topics} />
    </div>
  );
}

function Header({ count }: { count: number }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? 'Not following any topics yet'
            : `Following ${count} topic${count === 1 ? '' : 's'}`}
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/discover">+ Discover more</Link>
      </Button>
    </div>
  );
}

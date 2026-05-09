import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT role FROM users WHERE clerk_id = ${clerkId}`;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const topics = await sql`
    SELECT t.*, c.name AS category_name,
      COUNT(us.user_id)::int AS subscriber_count
    FROM topics t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN user_subscriptions us ON us.topic_id = t.id
    GROUP BY t.id, c.name
    ORDER BY t.verified DESC, t.name ASC
  `;
  return NextResponse.json(topics);
}

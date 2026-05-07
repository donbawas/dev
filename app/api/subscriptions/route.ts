import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json([]);

  const subs = await sql`
    SELECT topic_id FROM user_subscriptions WHERE user_id = ${user.id}
  `;
  return NextResponse.json(subs.map((s) => (s as { topic_id: number }).topic_id));
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { topic_id } = await req.json();
  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

  await sql`
    INSERT INTO user_subscriptions (user_id, topic_id)
    VALUES (${user.id}, ${topic_id})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}

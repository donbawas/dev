import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, props: { params: Promise<{ topicId: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { topicId } = await props.params;
  await sql`
    DELETE FROM user_subscriptions
    WHERE user_id = ${user.id} AND topic_id = ${Number(topicId)}
  `;
  return NextResponse.json({ ok: true });
}

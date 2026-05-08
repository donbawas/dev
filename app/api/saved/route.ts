import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json([]);
  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json([]);

  const saved = await sql`
    SELECT
      su.id AS saved_id, su.saved_at,
      u.id, u.title, u.url, u.description, u.update_type, u.published_at,
      t.name     AS topic_name, t.verified AS topic_verified,
      t.source_type, c.name AS category_name
    FROM saved_updates su
    JOIN updates u  ON u.id  = su.update_id
    JOIN topics t   ON t.id  = u.topic_id
    JOIN categories c ON c.id = t.category_id
    WHERE su.user_id = ${user.id}
    ORDER BY su.saved_at DESC
  `;
  return NextResponse.json(saved);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { update_id } = await req.json();
  await sql`
    INSERT INTO saved_updates (user_id, update_id) VALUES (${user.id}, ${update_id})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}

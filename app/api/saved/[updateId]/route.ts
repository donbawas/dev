import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(_req: Request, props: { params: Promise<{ updateId: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { updateId } = await props.params;
  await sql`DELETE FROM saved_updates WHERE user_id = ${user.id} AND update_id = ${Number(updateId)}`;
  return NextResponse.json({ ok: true });
}

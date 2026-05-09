import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT role FROM users WHERE clerk_id = ${clerkId}`;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await props.params;
  const { verified } = await req.json();

  const [topic] = await sql`
    UPDATE topics SET verified = ${verified} WHERE id = ${Number(id)} RETURNING *
  `;
  if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(topic);
}

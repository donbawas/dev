import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ plan: 'free' });
  const [user] = await sql`SELECT plan FROM users WHERE clerk_id = ${clerkId}`;
  return NextResponse.json({ plan: user?.plan ?? 'free' });
}

export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json();
  const valid = ['free', 'pro', 'team'];
  if (!valid.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  await sql`UPDATE users SET plan = ${plan} WHERE clerk_id = ${clerkId}`;
  return NextResponse.json({ ok: true, plan });
}

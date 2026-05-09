import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ plan: 'free', role: 'user' });
  const [user] = await sql`SELECT plan, role FROM users WHERE clerk_id = ${clerkId}`;
  return NextResponse.json({ plan: user?.plan ?? 'free', role: user?.role ?? 'user' });
}

export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, role } = await req.json();

  if (plan !== undefined) {
    const valid = ['free', 'pro', 'team'];
    if (!valid.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    await sql`UPDATE users SET plan = ${plan} WHERE clerk_id = ${clerkId}`;
  }

  if (role !== undefined) {
    const valid = ['user', 'admin'];
    if (!valid.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    await sql`UPDATE users SET role = ${role} WHERE clerk_id = ${clerkId}`;
  }

  return NextResponse.json({ ok: true });
}

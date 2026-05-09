import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id, role FROM users WHERE clerk_id = ${clerkId}`;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await props.params;
  const { action, rejection_reason } = await req.json();

  const [request] = await sql`SELECT * FROM topic_requests WHERE id = ${Number(id)}`;
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'approve') {
    const slug = request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const [topic] = await sql`
      INSERT INTO topics (category_id, name, slug, description, source_type, source_identifier, verified)
      VALUES (${request.category_id}, ${request.name}, ${slug}, ${request.description}, ${request.source_type}, ${request.source_identifier}, true)
      ON CONFLICT (slug) DO UPDATE SET verified = true
      RETURNING *
    `;
    await sql`
      UPDATE topic_requests
      SET status = 'approved', reviewed_by = ${user.id}, reviewed_at = NOW()
      WHERE id = ${Number(id)}
    `;
    return NextResponse.json({ ok: true, topic });
  }

  if (action === 'reject') {
    await sql`
      UPDATE topic_requests
      SET status = 'rejected', reviewed_by = ${user.id}, reviewed_at = NOW(), rejection_reason = ${rejection_reason ?? null}
      WHERE id = ${Number(id)}
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

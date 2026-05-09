import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import type { SourceType } from '@/lib/types';

export const runtime = 'nodejs';

const VALID_SOURCE_TYPES: SourceType[] = ['github', 'npm', 'rss', 'url', 'pypi', 'huggingface'];

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id, role FROM users WHERE clerk_id = ${clerkId}`;
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const requests = await sql`
    SELECT
      tr.*,
      u.name  AS requester_name,
      u.email AS requester_email,
      c.name  AS category_name
    FROM topic_requests tr
    JOIN users u ON u.id = tr.user_id
    LEFT JOIN categories c ON c.id = tr.category_id
    ORDER BY tr.created_at DESC
  `;
  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { name, source_type, source_identifier, category_id, description } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!VALID_SOURCE_TYPES.includes(source_type)) return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
  if (!source_identifier?.trim()) return NextResponse.json({ error: 'Source identifier is required' }, { status: 400 });

  const [request] = await sql`
    INSERT INTO topic_requests (user_id, name, source_type, source_identifier, category_id, description)
    VALUES (${user.id}, ${name.trim()}, ${source_type}, ${source_identifier.trim()}, ${category_id ?? null}, ${description?.trim() ?? null})
    RETURNING *
  `;
  return NextResponse.json(request, { status: 201 });
}

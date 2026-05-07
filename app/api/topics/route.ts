import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import type { SourceType } from '@/lib/types';

export const runtime = 'nodejs';

const VALID_SOURCE_TYPES: SourceType[] = ['github', 'npm', 'rss', 'url', 'pypi', 'huggingface'];

export async function GET() {
  const topics = await sql`SELECT * FROM topics ORDER BY name`;
  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { name, description, category_id, source_type, source_identifier } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!category_id) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  if (!VALID_SOURCE_TYPES.includes(source_type)) return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
  if (!source_identifier?.trim()) return NextResponse.json({ error: 'Source identifier is required' }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const [topic] = await sql`
    INSERT INTO topics (category_id, name, slug, description, source_type, source_identifier, created_by)
    VALUES (${category_id}, ${name.trim()}, ${slug}, ${description?.trim() || null}, ${source_type}, ${source_identifier.trim()}, ${user.id})
    RETURNING *
  `;
  return NextResponse.json(topic, { status: 201 });
}

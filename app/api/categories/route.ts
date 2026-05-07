import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const categories = await sql`
    SELECT c.*,
      json_agg(
        json_build_object(
          'id', t.id, 'category_id', t.category_id, 'name', t.name,
          'slug', t.slug, 'description', t.description,
          'source_type', t.source_type, 'source_identifier', t.source_identifier,
          'verified', t.verified, 'last_fetched_at', t.last_fetched_at,
          'created_at', t.created_at
        ) ORDER BY t.name
      ) FILTER (WHERE t.id IS NOT NULL) AS topics
    FROM categories c
    LEFT JOIN topics t ON t.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `;
  return NextResponse.json(categories.map(c => ({ ...c, topics: c.topics ?? [] })));
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const [category] = await sql`
    INSERT INTO categories (name, slug, description, created_by)
    VALUES (${name.trim()}, ${slug}, ${description?.trim() || null}, ${user.id})
    RETURNING *
  `;
  return NextResponse.json(category, { status: 201 });
}

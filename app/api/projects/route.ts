import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json([]);

  const projects = await sql`
    SELECT
      p.*,
      COUNT(pd.id)::int                                           AS dep_count,
      COUNT(pd.id) FILTER (WHERE pd.status = 'vulnerable')::int  AS vuln_count,
      COUNT(pd.id) FILTER (WHERE pd.status IN ('major','minor','patch'))::int AS outdated_count,
      COUNT(pd.id) FILTER (WHERE pd.is_deprecated)::int          AS deprecated_count
    FROM projects p
    LEFT JOIN project_dependencies pd ON pd.project_id = p.id
    WHERE p.user_id = ${user.id}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id, plan FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.plan === 'free') return NextResponse.json({ error: 'Pro plan required', code: 'UPGRADE_REQUIRED' }, { status: 403 });

  const { github_repo, name, description, default_branch } = await req.json();
  if (!github_repo) return NextResponse.json({ error: 'github_repo required' }, { status: 400 });

  const [project] = await sql`
    INSERT INTO projects (user_id, name, github_repo, description, default_branch)
    VALUES (${user.id}, ${name || github_repo.split('/')[1]}, ${github_repo}, ${description ?? null}, ${default_branch ?? 'main'})
    RETURNING *
  `;
  return NextResponse.json(project, { status: 201 });
}

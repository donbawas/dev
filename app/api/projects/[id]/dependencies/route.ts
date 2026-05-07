import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await props.params;
  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json([]);

  const [project] = await sql`SELECT id FROM projects WHERE id = ${Number(id)} AND user_id = ${user.id}`;
  if (!project) return NextResponse.json([]);

  const deps = await sql`
    SELECT * FROM project_dependencies
    WHERE project_id = ${project.id}
    ORDER BY
      CASE status
        WHEN 'vulnerable'  THEN 1
        WHEN 'deprecated'  THEN 2
        WHEN 'major'       THEN 3
        WHEN 'minor'       THEN 4
        WHEN 'patch'       THEN 5
        ELSE 6
      END,
      days_behind DESC,
      name ASC
  `;
  return NextResponse.json(deps);
}

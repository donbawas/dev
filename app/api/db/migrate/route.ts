import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS ai_summary TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'`;
  await sql`ALTER TABLE webhook_processed_prs ADD COLUMN IF NOT EXISTS repo_full_name VARCHAR(255)`.catch(() => null);
  await sql`UPDATE updates SET ai_summary = NULL WHERE ai_summary IS NOT NULL AND ai_summary NOT LIKE '{%'`;
  await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0`;
  // Remove duplicate updates keeping the newest per (topic_id, url)
  await sql`
    DELETE FROM updates
    WHERE id NOT IN (
      SELECT MAX(id) FROM updates WHERE url IS NOT NULL GROUP BY topic_id, url
    ) AND url IS NOT NULL
  `;

  return NextResponse.json({ ok: true, message: 'Migrations applied' });
}

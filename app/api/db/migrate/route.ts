import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS ai_summary TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'`;
  await sql`ALTER TABLE webhook_processed_prs ADD COLUMN IF NOT EXISTS repo_full_name VARCHAR(255)`.catch(() => null);
  await sql`UPDATE updates SET ai_summary = NULL WHERE ai_summary IS NOT NULL AND ai_summary NOT LIKE '{%'`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS updates_topic_url_idx ON updates (topic_id, url) WHERE url IS NOT NULL`;

  return NextResponse.json({ ok: true, message: 'Migrations applied' });
}

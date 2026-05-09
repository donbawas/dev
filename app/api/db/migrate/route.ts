import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS ai_summary TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free'`;
  await sql`ALTER TABLE webhook_processed_prs ADD COLUMN IF NOT EXISTS repo_full_name VARCHAR(255)`.catch(() => null);
  await sql`UPDATE updates SET ai_summary = NULL WHERE ai_summary IS NOT NULL AND ai_summary NOT LIKE '{%'`;
  await sql`ALTER TABLE updates ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`;
  await sql`
    CREATE TABLE IF NOT EXISTS topic_requests (
      id                SERIAL PRIMARY KEY,
      user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name              VARCHAR(255) NOT NULL,
      source_type       VARCHAR(50) NOT NULL,
      source_identifier VARCHAR(255) NOT NULL,
      category_id       INTEGER REFERENCES categories(id),
      description       TEXT,
      status            VARCHAR(20) DEFAULT 'pending',
      reviewed_by       INTEGER REFERENCES users(id),
      reviewed_at       TIMESTAMPTZ,
      rejection_reason  TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`UPDATE users SET role = 'admin' WHERE email = 'tomasvicente.harris@gmail.com'`;
  // Remove duplicate updates keeping the newest per (topic_id, url)
  await sql`
    DELETE FROM updates
    WHERE id NOT IN (
      SELECT MAX(id) FROM updates WHERE url IS NOT NULL GROUP BY topic_id, url
    ) AND url IS NOT NULL
  `;

  return NextResponse.json({ ok: true, message: 'Migrations applied' });
}

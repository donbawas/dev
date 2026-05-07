import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      clerk_id    VARCHAR(255) UNIQUE NOT NULL,
      email       VARCHAR(255) NOT NULL,
      name        VARCHAR(255),
      avatar_url  TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic       VARCHAR(255) NOT NULL,
      label       VARCHAR(255),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, topic)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS saved_items (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      url         TEXT,
      description TEXT,
      category    VARCHAR(100),
      saved_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  return NextResponse.json({ ok: true, message: 'Schema initialized' });
}

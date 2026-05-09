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
      plan        VARCHAR(50) DEFAULT 'free',
      role        VARCHAR(20) DEFAULT 'user',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      slug        VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS topics (
      id                SERIAL PRIMARY KEY,
      category_id       INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name              VARCHAR(255) NOT NULL,
      slug              VARCHAR(255) UNIQUE NOT NULL,
      description       TEXT,
      source_type       VARCHAR(50) NOT NULL,
      source_identifier VARCHAR(255) NOT NULL,
      verified          BOOLEAN DEFAULT false,
      last_fetched_at   TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS updates (
      id           SERIAL PRIMARY KEY,
      topic_id     INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      url          TEXT,
      description  TEXT,
      ai_summary   TEXT,
      update_type  VARCHAR(50) DEFAULT 'other',
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id   INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, topic_id)
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

  await sql`
    CREATE TABLE IF NOT EXISTS saved_updates (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      update_id  INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
      saved_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, update_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name             VARCHAR(255) NOT NULL,
      github_repo      VARCHAR(255),
      description      TEXT,
      default_branch   VARCHAR(255) DEFAULT 'main',
      source_type      VARCHAR(50) DEFAULT 'github',
      manifest_content TEXT,
      last_scanned_at  TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS project_dependencies (
      id               SERIAL PRIMARY KEY,
      project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name             VARCHAR(255) NOT NULL,
      current_version  VARCHAR(100),
      latest_version   VARCHAR(100),
      package_manager  VARCHAR(50) NOT NULL,
      dep_type         VARCHAR(50),
      status           VARCHAR(50),
      is_deprecated    BOOLEAN DEFAULT false,
      vuln_count       INTEGER DEFAULT 0,
      vuln_severity    VARCHAR(50),
      cve_ids          JSONB DEFAULT '[]',
      days_behind      INTEGER DEFAULT 0,
      license          VARCHAR(255),
      weekly_downloads INTEGER,
      changelog_url    TEXT,
      last_checked_at  TIMESTAMPTZ,
      UNIQUE(project_id, name, package_manager)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webhook_processed_prs (
      id             SERIAL PRIMARY KEY,
      repo_full_name VARCHAR(255) NOT NULL,
      pr_number      INTEGER NOT NULL,
      status         VARCHAR(20) DEFAULT 'pending',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(repo_full_name, pr_number)
    )
  `;

  return NextResponse.json({ ok: true, message: 'Schema initialized' });
}

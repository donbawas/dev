import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  fetchGithubReleases,
  fetchNpmUpdates,
  fetchPypiUpdates,
  fetchRssUpdates,
  type FetchedUpdate,
} from '@/lib/feed-fetchers';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const topics = await sql`SELECT * FROM topics WHERE verified = true ORDER BY last_fetched_at ASC NULLS FIRST`;
  const githubToken = process.env.GITHUB_TOKEN;

  let processed = 0;
  let inserted = 0;
  const errors: string[] = [];

  for (const topic of topics) {
    try {
      let updates: FetchedUpdate[] = [];

      switch (topic.source_type) {
        case 'github':
          updates = await fetchGithubReleases(topic.source_identifier, githubToken);
          break;
        case 'npm':
          updates = await fetchNpmUpdates(topic.source_identifier);
          break;
        case 'pypi':
          updates = await fetchPypiUpdates(topic.source_identifier);
          break;
        case 'rss':
          updates = await fetchRssUpdates(topic.source_identifier);
          break;
        default:
          // url, huggingface — not yet implemented
          break;
      }

      for (const u of updates) {
        if (!u.url) continue;
        const rows = await sql`
          INSERT INTO updates (topic_id, title, url, description, update_type, published_at)
          VALUES (${topic.id}, ${u.title}, ${u.url}, ${u.description}, ${u.update_type}, ${u.published_at})
          ON CONFLICT (topic_id, url) WHERE url IS NOT NULL DO NOTHING
          RETURNING id
        `;
        inserted += rows.length;
      }

      await sql`UPDATE topics SET last_fetched_at = NOW() WHERE id = ${topic.id}`;
      processed++;
    } catch (e) {
      const msg = `topic ${topic.id} (${topic.source_type}:${topic.source_identifier}): ${e instanceof Error ? e.message : String(e)}`;
      errors.push(msg);
      console.error('[scan-topics]', msg);
    }
  }

  return NextResponse.json({ processed, inserted, errors: errors.length > 0 ? errors : undefined });
}

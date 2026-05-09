import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await sql`SELECT id, plan FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.plan === 'free') return NextResponse.json({ error: 'Pro plan required', code: 'UPGRADE_REQUIRED' }, { status: 403 });

  const { id } = await props.params;

  const [update] = await sql`
    SELECT u.id, u.title, u.description, u.ai_summary, u.url,
           t.name AS topic_name, t.source_type, t.source_identifier,
           c.name AS category_name
    FROM updates u
    JOIN topics t ON t.id = u.topic_id
    JOIN categories c ON c.id = t.category_id
    WHERE u.id = ${Number(id)}
  `;
  if (!update) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Already generated — return cached result
  if (update.ai_summary) return NextResponse.json({ summary: update.ai_summary, cached: true });

  const client = new Anthropic();

  const context = [
    `Topic: ${update.topic_name} (${update.category_name})`,
    `Source: ${update.source_type} — ${update.source_identifier}`,
    `Title: ${update.title}`,
    update.description ? `Release notes:\n${update.description.slice(0, 3000)}` : 'No release notes available.',
  ].join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 384,
    messages: [{
      role: 'user',
      content: `You are summarizing a software release or update for developers.

${context}

Respond with ONLY valid JSON in this exact shape:
{
  "headline": "One sentence — what changed and why it matters",
  "bullets": ["specific change 1", "specific change 2", "specific change 3"],
  "breaking": true or false
}

Rules:
- headline: plain English, no "this release" opener, max 120 chars
- bullets: 2-4 items, each specific and actionable, max 80 chars each
- breaking: true only if there are breaking changes or required migration steps
- No markdown, no extra keys, valid JSON only`,
    }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : null;
  if (!raw) return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });

  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: { headline: string; bullets: string[]; breaking: boolean };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { headline: cleaned.slice(0, 120), bullets: [], breaking: false };
  }

  const summary = JSON.stringify(parsed);

  await sql`UPDATE updates SET ai_summary = ${summary} WHERE id = ${Number(id)}`;

  return NextResponse.json({ summary, cached: false });
}

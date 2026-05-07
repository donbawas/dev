import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  topics: string[];
  owner: { login: string; avatar_url: string };
}

function buildQuery(q: string, language: string): string {
  if (q) {
    const parts = [`${q} in:name,description,topics`];
    if (language) parts.push(`language:${language}`);
    return parts.join(' ');
  }
  // Trending: popular repos pushed in last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const parts = [`stars:>500 pushed:>${since}`];
  if (language) parts.push(`language:${language}`);
  return parts.join(' ');
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const language = searchParams.get('language')?.trim() ?? '';

  const query = buildQuery(q, language);
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=24`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 300 }, // cache 5 min
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data.items as GithubRepo[]);
}

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export interface GithubUserRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string;
  default_branch: string;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await clerkClient();
    const { data: tokens } = await client.users.getUserOauthAccessToken(clerkId, 'oauth_github');
    const token = tokens[0]?.token;

    if (!token) {
      return NextResponse.json({ error: 'GitHub not connected', code: 'NO_GITHUB_TOKEN' }, { status: 400 });
    }

    const res = await fetch(
      'https://api.github.com/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator',
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
    );

    if (!res.ok) return NextResponse.json({ error: 'GitHub API error' }, { status: res.status });

    const repos: GithubUserRepo[] = await res.json();
    return NextResponse.json(repos);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

type DepMap = Record<string, string>;

function parseVersion(v: string): string {
  return v.replace(/^[\^~>=<]/, '').split(' ')[0];
}

function classifyStatus(current: string, latest: string): string {
  try {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);
    if (c[0] < l[0]) return 'major';
    if (c[1] < l[1]) return 'minor';
    if (c[2] < l[2]) return 'patch';
    return 'up_to_date';
  } catch {
    return 'up_to_date';
  }
}

async function fetchLatestNpm(name: string): Promise<{ latest: string; deprecated: boolean; publishedAt: string | null }> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { latest: '', deprecated: false, publishedAt: null };
    const data = await res.json();
    return {
      latest: data.version ?? '',
      deprecated: !!data.deprecated,
      publishedAt: data.time?.modified ?? null,
    };
  } catch {
    return { latest: '', deprecated: false, publishedAt: null };
  }
}

async function fetchVulns(name: string, version: string): Promise<{ count: number; severity: string | null }> {
  try {
    const res = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version, package: { name, ecosystem: 'npm' } }),
    });
    if (!res.ok) return { count: 0, severity: null };
    const data = await res.json();
    const vulns: { severity?: { type: string }[] }[] = data.vulns ?? [];
    if (vulns.length === 0) return { count: 0, severity: null };
    const severities = vulns.flatMap((v) => v.severity?.map((s) => s.type) ?? []);
    const top = severities.includes('CRITICAL') ? 'CRITICAL'
      : severities.includes('HIGH') ? 'HIGH'
      : severities.includes('MODERATE') ? 'MODERATE'
      : 'LOW';
    return { count: vulns.length, severity: top };
  } catch {
    return { count: 0, severity: null };
  }
}

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await props.params;
  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const [project] = await sql`SELECT * FROM projects WHERE id = ${Number(id)} AND user_id = ${user.id}`;
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Get GitHub token
  const client = await clerkClient();
  const { data: tokens } = await client.users.getUserOauthAccessToken(clerkId, 'oauth_github');
  const token = tokens[0]?.token;
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });

  // Fetch package.json
  const ghRes = await fetch(
    `https://api.github.com/repos/${project.github_repo}/contents/package.json?ref=${project.default_branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  );
  if (!ghRes.ok) return NextResponse.json({ error: 'package.json not found' }, { status: 404 });

  const { content } = await ghRes.json();
  const pkg = JSON.parse(Buffer.from(content, 'base64').toString());

  const deps: { name: string; version: string; type: string }[] = [
    ...Object.entries((pkg.dependencies ?? {}) as DepMap).map(([n, v]) => ({ name: n, version: v, type: 'production' })),
    ...Object.entries((pkg.devDependencies ?? {}) as DepMap).map(([n, v]) => ({ name: n, version: v, type: 'dev' })),
  ];

  // Process in batches of 5 to avoid rate limiting
  const results = [];
  for (let i = 0; i < deps.length; i += 5) {
    const batch = deps.slice(i, i + 5);
    const resolved = await Promise.all(
      batch.map(async ({ name, version, type }) => {
        const current = parseVersion(version);
        const [npm, vulns] = await Promise.all([
          fetchLatestNpm(name),
          current ? fetchVulns(name, current) : Promise.resolve({ count: 0, severity: null }),
        ]);

        let status = classifyStatus(current, npm.latest);
        if (vulns.count > 0) status = 'vulnerable';
        if (npm.deprecated) status = 'deprecated';

        let daysBehind = 0;
        if (npm.publishedAt && status !== 'up_to_date') {
          daysBehind = Math.floor((Date.now() - new Date(npm.publishedAt).getTime()) / 86400000);
        }

        return { name, current, latest: npm.latest, type, status, deprecated: npm.deprecated, vulns, daysBehind };
      }),
    );
    results.push(...resolved);
  }

  // Upsert into DB
  for (const r of results) {
    await sql`
      INSERT INTO project_dependencies
        (project_id, name, current_version, latest_version, package_manager, dep_type, status, is_deprecated, vuln_count, vuln_severity, days_behind, last_checked_at)
      VALUES
        (${project.id}, ${r.name}, ${r.current || null}, ${r.latest || null}, 'npm', ${r.type}, ${r.status}, ${r.deprecated}, ${r.vulns.count}, ${r.vulns.severity}, ${r.daysBehind}, NOW())
      ON CONFLICT (project_id, name, package_manager)
      DO UPDATE SET
        current_version = EXCLUDED.current_version,
        latest_version  = EXCLUDED.latest_version,
        dep_type        = EXCLUDED.dep_type,
        status          = EXCLUDED.status,
        is_deprecated   = EXCLUDED.is_deprecated,
        vuln_count      = EXCLUDED.vuln_count,
        vuln_severity   = EXCLUDED.vuln_severity,
        days_behind     = EXCLUDED.days_behind,
        last_checked_at = NOW()
    `;
  }

  await sql`UPDATE projects SET last_scanned_at = NOW() WHERE id = ${project.id}`;

  return NextResponse.json({ scanned: results.length });
}

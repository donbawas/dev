import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { sql } from '@/lib/db';
import { scanProject } from '@/lib/scanner';

export const runtime = 'nodejs';

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await props.params;

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${clerkId}`;
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const [project] = await sql`
    SELECT * FROM projects WHERE id = ${Number(id)} AND user_id = ${user.id}
  `;
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Get GitHub token from Clerk OAuth
  const client = await clerkClient();
  const { data: tokens } = await client.users.getUserOauthAccessToken(clerkId, 'oauth_github');
  const token = tokens[0]?.token;
  if (!token) return NextResponse.json({ error: 'GitHub not connected', code: 'NO_GITHUB_TOKEN' }, { status: 400 });

  // Run the scanner
  const { deps, detectedEcosystems } = await scanProject(
    project.github_repo,
    project.default_branch ?? 'main',
    token,
  );

  if (deps.length === 0) {
    return NextResponse.json({ error: 'No supported package manifests found', detectedEcosystems: [] }, { status: 404 });
  }

  // Upsert all dependencies
  for (const dep of deps) {
    await sql`
      INSERT INTO project_dependencies (
        project_id, name, current_version, latest_version,
        package_manager, dep_type, status,
        is_deprecated, vuln_count, vuln_severity, cve_ids,
        days_behind, license, weekly_downloads, changelog_url,
        last_checked_at
      ) VALUES (
        ${project.id}, ${dep.name},
        ${dep.currentVersion || null}, ${dep.latestVersion || null},
        ${dep.ecosystem}, ${dep.type}, ${dep.status},
        ${dep.isDeprecated}, ${dep.vulnCount}, ${dep.vulnSeverity},
        ${JSON.stringify(dep.cveIds)},
        ${dep.daysBehind}, ${dep.license}, ${dep.weeklyDownloads},
        ${dep.changelogUrl}, NOW()
      )
      ON CONFLICT (project_id, name, package_manager)
      DO UPDATE SET
        current_version  = EXCLUDED.current_version,
        latest_version   = EXCLUDED.latest_version,
        dep_type         = EXCLUDED.dep_type,
        status           = EXCLUDED.status,
        is_deprecated    = EXCLUDED.is_deprecated,
        vuln_count       = EXCLUDED.vuln_count,
        vuln_severity    = EXCLUDED.vuln_severity,
        cve_ids          = EXCLUDED.cve_ids,
        days_behind      = EXCLUDED.days_behind,
        license          = EXCLUDED.license,
        weekly_downloads = EXCLUDED.weekly_downloads,
        changelog_url    = EXCLUDED.changelog_url,
        last_checked_at  = NOW()
    `;
  }

  await sql`UPDATE projects SET last_scanned_at = NOW() WHERE id = ${project.id}`;

  return NextResponse.json({ scanned: deps.length, ecosystems: detectedEcosystems });
}

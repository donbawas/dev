import type { UpdateType } from './types';

export interface FetchedUpdate {
  title: string;
  url: string | null;
  description: string | null;
  update_type: UpdateType;
  published_at: string | null;
}

// Strip markdown noise from release bodies, return first ~400 chars of readable text
function extractDescription(body: string): string | null {
  if (!body?.trim()) return null;
  const cleaned = body
    .replace(/#{1,6}\s+[^\n]*/g, '')        // headings
    .replace(/\*\*(.*?)\*\*/g, '$1')         // bold
    .replace(/`[^`]+`/g, '')                 // inline code
    .replace(/```[\s\S]*?```/g, '')          // code blocks
    .replace(/- \[.\] .*/g, '')              // checkboxes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned) return null;
  const truncated = cleaned.slice(0, 400);
  return truncated.length < cleaned.length
    ? truncated.replace(/\s+\S*$/, '…')
    : truncated;
}

// ── GitHub releases ──────────────────────────────────────────────────────────

export async function fetchGithubReleases(
  repo: string,
  token?: string,
  firstScan = false,
): Promise<FetchedUpdate[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const perPage = firstScan ? 20 : 5;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=${perPage}`,
    { headers },
  );
  if (!res.ok) return [];
  const releases = await res.json() as {
    name: string; tag_name: string; html_url: string;
    body: string | null; published_at: string | null; draft: boolean; prerelease: boolean;
  }[];

  return releases
    .filter((r) => !r.draft && !r.prerelease)
    .map((r) => ({
      title: r.name?.trim() || r.tag_name,
      url: r.html_url,
      description: extractDescription(r.body ?? ''),
      update_type: 'release' as UpdateType,
      published_at: r.published_at,
    }));
}

// ── npm ──────────────────────────────────────────────────────────────────────

export async function fetchNpmUpdates(packageName: string, firstScan = false): Promise<FetchedUpdate[]> {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
  if (!res.ok) return [];
  const data = await res.json() as {
    time?: Record<string, string>;
    versions?: Record<string, { description?: string }>;
    description?: string;
  };

  const times = Object.entries(data.time ?? {})
    .filter(([v]) => !['created', 'modified'].includes(v))
    .sort(([, a], [, b]) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, firstScan ? 20 : 5);

  return times.map(([version, time]) => ({
    title: `${packageName} v${version}`,
    url: `https://www.npmjs.com/package/${packageName}/v/${version}`,
    description: data.versions?.[version]?.description ?? data.description ?? null,
    update_type: 'release' as UpdateType,
    published_at: new Date(time).toISOString(),
  }));
}

// ── PyPI ─────────────────────────────────────────────────────────────────────

export async function fetchPypiUpdates(packageName: string, firstScan = false): Promise<FetchedUpdate[]> {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
  if (!res.ok) return [];
  const data = await res.json() as {
    info?: { summary?: string };
    releases?: Record<string, { upload_time?: string }[]>;
  };

  const releases = Object.entries(data.releases ?? {})
    .map(([version, files]) => ({ version, upload_time: files[0]?.upload_time }))
    .filter((r): r is { version: string; upload_time: string } => !!r.upload_time)
    .sort((a, b) => new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime())
    .slice(0, firstScan ? 20 : 5);

  return releases.map(({ version, upload_time }) => ({
    title: `${packageName} ${version}`,
    url: `https://pypi.org/project/${packageName}/${version}/`,
    description: data.info?.summary ?? null,
    update_type: 'release' as UpdateType,
    published_at: new Date(upload_time).toISOString(),
  }));
}

// ── RSS / Atom ────────────────────────────────────────────────────────────────

export async function fetchRssUpdates(feedUrl: string): Promise<FetchedUpdate[]> {
  const res = await fetch(feedUrl, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  if (!res.ok) return [];
  const xml = await res.text();

  const items: FetchedUpdate[] = [];
  // Match both RSS <item> and Atom <entry>
  const blockRe = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = blockRe.exec(xml)) !== null && items.length < 5) {
    const block = match[1] ?? match[2];

    const title = block
      .match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, '').trim();

    const link =
      block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ??
      block.match(/<link[^>]*>(https?:\/\/[^\s<]+)<\/link>/i)?.[1];

    const pubRaw =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ??
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] ??
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1];

    const descRaw =
      block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] ??
      block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1];

    const description = descRaw
      ? descRaw.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 400) || null
      : null;

    if (!title || !link) continue;

    let published_at: string | null = null;
    if (pubRaw) {
      const d = new Date(pubRaw.trim());
      if (!isNaN(d.getTime())) published_at = d.toISOString();
    }

    items.push({
      title,
      url: link,
      description,
      update_type: 'article',
      published_at,
    });
  }

  return items;
}

import type { ManifestFile, Ecosystem } from './types';

const MANIFEST_FILES: { path: string; ecosystem: Ecosystem }[] = [
  { path: 'package.json',     ecosystem: 'npm'      },
  { path: 'requirements.txt', ecosystem: 'pypi'     },
  { path: 'pyproject.toml',   ecosystem: 'pypi'     },
  { path: 'Pipfile',          ecosystem: 'pypi'     },
  { path: 'Cargo.toml',       ecosystem: 'cargo'    },
  { path: 'go.mod',           ecosystem: 'go'       },
  { path: 'Gemfile',          ecosystem: 'rubygems' },
];

async function fetchFile(
  repo: string,
  branch: string,
  path: string,
  token: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.content) return null;
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

export async function detectManifests(
  repo: string,
  branch: string,
  token: string,
): Promise<ManifestFile[]> {
  const results = await Promise.all(
    MANIFEST_FILES.map(async ({ path, ecosystem }) => {
      const content = await fetchFile(repo, branch, path, token);
      if (!content) return null;
      return { path, ecosystem, content } satisfies ManifestFile;
    }),
  );
  return results.filter((r): r is ManifestFile => r !== null);
}

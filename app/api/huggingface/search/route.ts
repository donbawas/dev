import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface HFModel {
  id: string;
  author: string;
  downloads: number;
  likes: number;
  lastModified: string;
  tags: string[];
  pipeline_tag: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const params = new URLSearchParams({ limit: '24', full: 'false', sort: 'downloads', direction: '-1' });
  if (q) params.set('search', q);

  const headers: HeadersInit = { 'User-Agent': 'devnews/1.0' };
  if (process.env.HF_TOKEN) headers['Authorization'] = `Bearer ${process.env.HF_TOKEN}`;

  const res = await fetch(`https://huggingface.co/api/models?${params}`, {
    headers,
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'HuggingFace API error' }, { status: res.status });
  }

  const data: HFModel[] = await res.json();
  return NextResponse.json(data);
}

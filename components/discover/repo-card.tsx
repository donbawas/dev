'use client';

import { Star, GitFork, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from '@/lib/date';
import type { GithubRepo } from '@/app/api/github/search/route';

interface Props {
  repo: GithubRepo;
  onTrack: (repo: GithubRepo) => void;
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python:     'bg-green-500',
  Rust:       'bg-orange-500',
  Go:         'bg-cyan-500',
  C:          'bg-gray-500',
  'C++':      'bg-pink-500',
  Java:       'bg-red-500',
  Zig:        'bg-amber-500',
};

export function RepoCard({ repo, onTrack }: Props) {
  const pushedAgo = formatDistanceToNow(new Date(repo.pushed_at));
  const dotColor = LANGUAGE_COLORS[repo.language ?? ''] ?? 'bg-muted-foreground';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-semibold text-card-foreground hover:underline"
          >
            <span className="truncate">{repo.full_name}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {repo.description}
            </p>
          )}
        </div>
      </div>

      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="size-3" />
            {formatStars(repo.stargazers_count)}
          </span>
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className={`size-2 rounded-full ${dotColor}`} />
              {repo.language}
            </span>
          )}
          <span>pushed {pushedAgo}</span>
        </div>
      </div>

      <Button size="sm" variant="outline" className="mt-auto w-full" onClick={() => onTrack(repo)}>
        Track this
      </Button>
    </div>
  );
}

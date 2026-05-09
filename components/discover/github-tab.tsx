'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RepoCard } from './repo-card';
import { CreateTopicDialog } from '@/components/subscriptions/create-topic-dialog';
import { RequestTopicDialog } from '@/components/admin/request-topic-dialog';
import type { GithubRepo } from '@/app/api/github/search/route';
import type { Category, Topic } from '@/lib/types';

const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'C++', 'Java', 'Zig', 'Swift', 'Kotlin'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Props {
  categories: Category[];
  onTopicCreated: (topic: Topic) => void;
  trackedIdentifiers?: Set<string>;
  isAdmin?: boolean;
}

export function GithubTab({ categories, onTopicCreated, trackedIdentifiers = new Set(), isAdmin = false }: Props) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackRepo, setTrackRepo] = useState<GithubRepo | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  const fetchRepos = useCallback(async (q: string, lang: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (lang && lang !== 'all') params.set('language', lang);
      const res = await fetch(`/api/github/search?${params}`);
      if (!res.ok) throw new Error('GitHub API error');
      setRepos(await res.json());
    } catch {
      setError('Failed to fetch repositories. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos(debouncedQuery, language);
  }, [debouncedQuery, language, fetchRepos]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search repositories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {!debouncedQuery ? 'Trending this month — sorted by stars' : `${repos.length} results for "${debouncedQuery}"`}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchRepos(debouncedQuery, language)}>Retry</Button>
        </div>
      ) : repos.length === 0 ? (
        <div className="flex justify-center py-16">
          <p className="text-sm text-muted-foreground">No repositories found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} onTrack={setTrackRepo} isTracked={trackedIdentifiers.has(repo.full_name)} />
          ))}
        </div>
      )}

      {trackRepo && isAdmin && (
        <CreateTopicDialog
          open
          onClose={() => setTrackRepo(null)}
          onCreated={(topic) => { onTopicCreated(topic); setTrackRepo(null); }}
          categories={categories}
          lockSourceFields
          initialValues={{
            name: trackRepo.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: trackRepo.description ?? '',
            source_type: 'github',
            source_identifier: trackRepo.full_name,
          }}
        />
      )}
      {trackRepo && !isAdmin && (
        <RequestTopicDialog
          open
          onClose={() => setTrackRepo(null)}
          categories={categories}
          initialValues={{
            name: trackRepo.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: trackRepo.description ?? '',
            source_type: 'github',
            source_identifier: trackRepo.full_name,
          }}
        />
      )}
    </div>
  );
}

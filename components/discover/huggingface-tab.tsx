'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HFModelCard } from './hf-model-card';
import { CreateTopicDialog } from '@/components/subscriptions/create-topic-dialog';
import type { HFModel } from '@/app/api/huggingface/search/route';
import type { Category, Topic } from '@/lib/types';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function modelDisplayName(id: string): string {
  const part = id.includes('/') ? id.split('/')[1] : id;
  return part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  categories: Category[];
  onTopicCreated: (topic: Topic) => void;
}

export function HuggingfaceTab({ categories, onTopicCreated }: Props) {
  const [query, setQuery] = useState('');
  const [models, setModels] = useState<HFModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackModel, setTrackModel] = useState<HFModel | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  const fetchModels = useCallback(async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch(`/api/huggingface/search?${params}`);
      if (!res.ok) throw new Error();
      setModels(await res.json());
    } catch {
      setError('Failed to fetch models. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels(debouncedQuery);
  }, [debouncedQuery, fetchModels]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search models…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {!debouncedQuery ? 'Trending on Hugging Face' : `${models.length} results for "${debouncedQuery}"`}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchModels(debouncedQuery)}>Retry</Button>
        </div>
      ) : models.length === 0 ? (
        <div className="flex justify-center py-16">
          <p className="text-sm text-muted-foreground">No models found.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {models.map((model) => (
            <HFModelCard key={model.id} model={model} onTrack={setTrackModel} />
          ))}
        </div>
      )}

      {trackModel && (
        <CreateTopicDialog
          open
          onClose={() => setTrackModel(null)}
          onCreated={(topic) => { onTopicCreated(topic); setTrackModel(null); }}
          categories={categories}
          lockSourceFields
          initialValues={{
            name: modelDisplayName(trackModel.id),
            description: trackModel.pipeline_tag ?? '',
            source_type: 'huggingface',
            source_identifier: trackModel.id,
          }}
        />
      )}
    </div>
  );
}

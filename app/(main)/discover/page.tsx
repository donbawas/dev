'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitBranch } from 'lucide-react';
import { GithubTab } from '@/components/discover/github-tab';
import { BrowseTab } from '@/components/discover/browse-tab';
import { HuggingfaceTab } from '@/components/discover/huggingface-tab';
import type { CategoryWithTopics, Category, Topic } from '@/lib/types';

export default function DiscoverPage() {
  const [categories, setCategories] = useState<CategoryWithTopics[]>([]);
  const [subscribedIds, setSubscribedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/subscriptions').then((r) => r.json()),
    ]).then(([cats, subs]) => {
      setCategories(cats);
      setSubscribedIds(subs);
      setLoading(false);
    });
  }, []);

  const flatCategories: Category[] = categories.map(({ topics: _t, ...c }) => c);

  function handleTopicCreated(topic: Topic) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === topic.category_id
          ? { ...c, topics: [...c.topics, topic].sort((a, b) => a.name.localeCompare(b.name)) }
          : c,
      ),
    );
    setSubscribedIds((prev) => [...prev, topic.id]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Discover</h1>
        <p className="text-sm text-muted-foreground">Find and subscribe to topics you care about</p>
      </div>

      <Tabs defaultValue="github">
        <TabsList>
          <TabsTrigger value="github" className="gap-1.5">
            <GitBranch className="size-3.5" /> GitHub
          </TabsTrigger>
          <TabsTrigger value="huggingface">Hugging Face</TabsTrigger>
          <TabsTrigger value="browse">Browse topics</TabsTrigger>
        </TabsList>

        <TabsContent value="github" className="mt-4">
          <GithubTab categories={flatCategories} onTopicCreated={handleTopicCreated} />
        </TabsContent>

        <TabsContent value="huggingface" className="mt-4">
          <HuggingfaceTab categories={flatCategories} onTopicCreated={handleTopicCreated} />
        </TabsContent>

        <TabsContent value="browse" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : (
            <BrowseTab
              initialCategories={categories}
              initialSubscribedIds={subscribedIds}
              onTopicCreated={handleTopicCreated}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FolderPlus, Plus } from 'lucide-react';
import { TopicCard } from './topic-card';
import { CreateCategoryDialog } from './create-category-dialog';
import { CreateTopicDialog } from './create-topic-dialog';
import type { CategoryWithTopics, Topic, Category } from '@/lib/types';

interface Props {
  initialCategories: CategoryWithTopics[];
  initialSubscribedIds: number[];
}

export function SubscriptionsClient({ initialCategories, initialSubscribedIds }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set(initialSubscribedIds));
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);

  const allCategories: Category[] = categories.map(({ topics: _t, ...c }) => c);

  async function handleToggle(topicId: number, wasSubscribed: boolean) {
    if (wasSubscribed) {
      await fetch(`/api/subscriptions/${topicId}`, { method: 'DELETE' });
      setSubscribedIds((prev) => { const next = new Set(prev); next.delete(topicId); return next; });
    } else {
      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId }),
      });
      setSubscribedIds((prev) => new Set(prev).add(topicId));
    }
  }

  function handleCategoryCreated(category: Category) {
    setCategories((prev) => [...prev, { ...category, topics: [] }].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleTopicCreated(topic: Topic) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === topic.category_id
          ? { ...c, topics: [...c.topics, topic].sort((a, b) => a.name.localeCompare(b.name)) }
          : c,
      ),
    );
  }

  const subscribedCount = subscribedIds.size;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            {subscribedCount === 0
              ? 'Subscribe to topics to build your feed'
              : `Following ${subscribedCount} topic${subscribedCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewCategory(true)}>
            <FolderPlus className="size-4" /> Category
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNewTopic(true)}>
            <Plus className="size-4" /> Topic
          </Button>
        </div>
      </div>

      <Tabs defaultValue={categories[0]?.slug ?? ''} className="flex flex-col gap-4">
        <TabsList className="flex-wrap justify-start">
          {categories.map((cat) => (
            <TabsTrigger key={cat.slug} value={cat.slug} className="gap-1.5">
              {cat.name}
              {cat.topics.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {cat.topics.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.slug} value={cat.slug} className="mt-0">
            {cat.topics.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                <p className="text-sm font-medium text-foreground">No topics yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add the first topic to <span className="font-medium">{cat.name}</span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 gap-1.5"
                  onClick={() => setShowNewTopic(true)}
                >
                  <Plus className="size-3.5" /> Add topic
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    subscribed={subscribedIds.has(topic.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateCategoryDialog
        open={showNewCategory}
        onClose={() => setShowNewCategory(false)}
        onCreated={handleCategoryCreated}
      />
      <CreateTopicDialog
        open={showNewTopic}
        onClose={() => setShowNewTopic(false)}
        onCreated={handleTopicCreated}
        categories={allCategories}
      />
    </>
  );
}

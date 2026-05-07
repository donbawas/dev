'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopicCard } from '@/components/subscriptions/topic-card';
import { CreateCategoryDialog } from '@/components/subscriptions/create-category-dialog';
import { CreateTopicDialog } from '@/components/subscriptions/create-topic-dialog';
import type { CategoryWithTopics, Category, Topic } from '@/lib/types';

interface Props {
  initialCategories: CategoryWithTopics[];
  initialSubscribedIds: number[];
  onTopicCreated: (topic: Topic) => void;
}

export function BrowseTab({ initialCategories, initialSubscribedIds, onTopicCreated: notifyParent }: Props) {
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
    setSubscribedIds((prev) => new Set(prev).add(topic.id));
    notifyParent(topic);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewCategory(true)}>
          <FolderPlus className="size-4" /> Category
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => setShowNewTopic(true)}>
          <Plus className="size-4" /> Topic
        </Button>
      </div>

      {categories.map((cat) => (
        <section key={cat.id}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{cat.name}</h2>
            <span className="text-xs text-muted-foreground">{cat.topics.length} topics</span>
          </div>
          {cat.topics.length === 0 ? (
            <p className="text-xs text-muted-foreground">No topics yet.</p>
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
        </section>
      ))}

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
    </div>
  );
}

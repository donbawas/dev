'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_PLACEHOLDER } from '@/lib/types';
import type { Category, Topic, SourceType } from '@/lib/types';

interface InitialValues {
  name?: string;
  description?: string;
  source_type?: SourceType;
  source_identifier?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (topic: Topic) => void;
  categories: Category[];
  defaultCategoryId?: number;
  initialValues?: InitialValues;
  lockSourceFields?: boolean;
}

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];

export function CreateTopicDialog({ open, onClose, onCreated, categories, defaultCategoryId, initialValues, lockSourceFields }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [categoryId, setCategoryId] = useState(defaultCategoryId?.toString() ?? '');
  const [sourceType, setSourceType] = useState<SourceType>(initialValues?.source_type ?? 'github');
  const [sourceIdentifier, setSourceIdentifier] = useState(initialValues?.source_identifier ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category_id: Number(categoryId),
          source_type: sourceType,
          source_identifier: sourceIdentifier,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong');
        return;
      }
      const topic = await res.json();
      onCreated(topic);
      setName(initialValues?.name ?? '');
      setDescription(initialValues?.description ?? '');
      setCategoryId(defaultCategoryId?.toString() ?? '');
      setSourceType(initialValues?.source_type ?? 'github');
      setSourceIdentifier(initialValues?.source_identifier ?? '');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Topic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-name">Name</Label>
            <Input
              id="topic-name"
              placeholder="e.g. Next.js"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Source type</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => { setSourceType(v as SourceType); setSourceIdentifier(''); }}
                disabled={lockSourceFields}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source-id">Identifier</Label>
              <Input
                id="source-id"
                placeholder={SOURCE_TYPE_PLACEHOLDER[sourceType]}
                value={sourceIdentifier}
                onChange={(e) => setSourceIdentifier(e.target.value)}
                disabled={lockSourceFields}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="topic-desc"
              placeholder="What is this topic about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !name.trim() || !categoryId || !sourceIdentifier.trim()}>
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

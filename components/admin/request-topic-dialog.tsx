'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_PLACEHOLDER } from '@/lib/types';
import type { Category, SourceType } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}

const SOURCE_TYPES = Object.keys(SOURCE_TYPE_LABELS) as SourceType[];

export function RequestTopicDialog({ open, onClose, categories }: Props) {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('github');
  const [sourceIdentifier, setSourceIdentifier] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setName(''); setSourceType('github'); setSourceIdentifier('');
    setCategoryId(''); setDescription(''); setDone(false); setError('');
  }

  async function handleSubmit() {
    if (!name.trim() || !sourceIdentifier.trim()) {
      setError('Name and source identifier are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/topic-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, source_type: sourceType, source_identifier: sourceIdentifier, category_id: categoryId ? Number(categoryId) : null, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to submit request');
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a topic</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <span className="text-lg">✓</span>
            </div>
            <p className="text-sm font-medium text-foreground">Request submitted</p>
            <p className="text-xs text-muted-foreground">An admin will review your request soon.</p>
            <Button size="sm" onClick={() => { reset(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Next.js" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Source type</Label>
                <Select value={sourceType} onValueChange={(v) => { setSourceType(v as SourceType); setSourceIdentifier(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Identifier</Label>
                <Input
                  placeholder={SOURCE_TYPE_PLACEHOLDER[sourceType]}
                  value={sourceIdentifier}
                  onChange={(e) => setSourceIdentifier(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Why should this be added? <span className="text-muted-foreground">(optional)</span></Label>
                <Input placeholder="Brief description or reason" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit request
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

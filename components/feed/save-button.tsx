'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  updateId: number;
  initialSaved: boolean;
}

export function SaveButton({ updateId, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    setSaved((prev) => !prev);
    try {
      if (saved) {
        await fetch(`/api/saved/${updateId}`, { method: 'DELETE' });
      } else {
        await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ update_id: updateId }),
        });
      }
    } catch {
      setSaved((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="gap-2" onClick={toggle} disabled={loading}>
      {saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}

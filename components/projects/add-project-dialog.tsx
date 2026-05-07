'use client';

import { useState, useEffect } from 'react';
import { Loader2, GitBranch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GithubUserRepo } from '@/app/api/github/repos/route';

interface Project {
  id: number;
  name: string;
  github_repo: string;
  default_branch: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function AddProjectDialog({ open, onClose, onCreated }: Props) {
  const [repos, setRepos] = useState<GithubUserRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [noGithub, setNoGithub] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoadingRepos(true);
    setNoGithub(false);
    fetch('/api/github/repos')
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 'NO_GITHUB_TOKEN') { setNoGithub(true); return; }
        setRepos(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoadingRepos(false));
  }, [open]);

  async function handleCreate() {
    if (!selectedRepo) return;
    setCreating(true);
    setError('');
    const repo = repos.find((r) => r.full_name === selectedRepo);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_repo: selectedRepo,
          name: repo?.name ?? selectedRepo.split('/')[1],
          default_branch: repo?.default_branch ?? 'main',
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const project = await res.json();
      onCreated(project);
      setSelectedRepo('');
      onClose();
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
        </DialogHeader>

        {loadingRepos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : noGithub ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <GitBranch className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">GitHub not connected</p>
            <p className="text-xs text-muted-foreground">
              Connect your GitHub account in profile settings to import your repositories.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Select a repository</Label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a repo…" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((r) => (
                    <SelectItem key={r.id} value={r.full_name}>
                      <span className="flex items-center gap-2">
                        {r.full_name}
                        {r.private && <span className="text-[10px] text-muted-foreground">private</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                We'll detect your <code className="font-mono">package.json</code> and scan dependencies automatically.
              </p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!selectedRepo || creating || noGithub}>
            {creating ? <><Loader2 className="mr-2 size-3.5 animate-spin" /> Adding…</> : 'Add & scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

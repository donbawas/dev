'use client';

import { useState, useEffect } from 'react';
import { Loader2, GitBranch, FileCode2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detectManifestFilename } from '@/lib/scanner';
import type { GithubUserRepo } from '@/app/api/github/repos/route';

interface Project {
  id: number;
  name: string;
  github_repo: string | null;
  source_type: string;
  default_branch: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function AddProjectDialog({ open, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<'github' | 'manual'>('github');

  // GitHub tab state
  const [repos, setRepos] = useState<GithubUserRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [noGithub, setNoGithub] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');

  // Manual tab state
  const [manualName, setManualName] = useState('');
  const [manifestContent, setManifestContent] = useState('');
  const detectedFile = manifestContent.trim() ? detectManifestFilename(manifestContent) : null;

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setError(''); setSelectedRepo(''); setManualName(''); setManifestContent(''); return; }
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
    setCreating(true);
    setError('');
    try {
      let body: Record<string, string>;

      if (tab === 'github') {
        if (!selectedRepo) return;
        const repo = repos.find((r) => r.full_name === selectedRepo);
        body = {
          github_repo: selectedRepo,
          name: repo?.name ?? selectedRepo.split('/')[1],
          default_branch: repo?.default_branch ?? 'main',
        };
      } else {
        if (!manualName.trim() || !manifestContent.trim()) return;
        body = { name: manualName.trim(), manifest_content: manifestContent.trim() };
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const project = await res.json();
      onCreated(project);
      onClose();
    } finally {
      setCreating(false);
    }
  }

  const canSubmit = tab === 'github'
    ? !!selectedRepo && !noGithub
    : !!manualName.trim() && !!manifestContent.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add project</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'github' | 'manual'); setError(''); }}>
          <TabsList className="w-full">
            <TabsTrigger value="github" className="flex-1 gap-1.5">
              <GitBranch className="size-3.5" /> GitHub repo
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1 gap-1.5">
              <FileCode2 className="size-3.5" /> Paste manifest
            </TabsTrigger>
          </TabsList>

          {/* ── GitHub tab ── */}
          <TabsContent value="github" className="mt-4">
            {loadingRepos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : noGithub ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <GitBranch className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">GitHub not connected</p>
                <p className="text-xs text-muted-foreground">
                  Connect your GitHub account so DevPulse can read your repositories.
                </p>
                <a href="/user-profile" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">Connect GitHub in profile</Button>
                </a>
              </div>
            ) : (
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
                  We'll detect your manifest files and scan dependencies automatically.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── Manual tab ── */}
          <TabsContent value="manual" className="mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Project name</Label>
                <Input
                  placeholder="my-app"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>Paste your manifest</Label>
                  {detectedFile && (
                    <span className="text-[11px] font-mono text-primary">{detectedFile} detected</span>
                  )}
                </div>
                <textarea
                  className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={'Paste package.json, requirements.txt, Cargo.toml, go.mod…'}
                  value={manifestContent}
                  onChange={(e) => setManifestContent(e.target.value)}
                  spellCheck={false}
                />
                <p className="text-[11px] text-muted-foreground">
                  Supports package.json, requirements.txt, pyproject.toml, Cargo.toml, go.mod, Gemfile.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!canSubmit || creating}>
            {creating ? <><Loader2 className="mr-2 size-3.5 animate-spin" /> Adding…</> : 'Add & scan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

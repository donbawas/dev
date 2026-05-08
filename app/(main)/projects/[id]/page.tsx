'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ExternalLink, Loader2, ShieldAlert, AlertTriangle, CheckCircle2, ArrowUpCircle, Sparkles, BookOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DonutChart } from '@/components/ui/donut-chart';
import { HealthBadge } from '@/components/projects/health-badge';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';

interface Dependency {
  id: number;
  name: string;
  current_version: string | null;
  latest_version: string | null;
  package_manager: string;
  dep_type: string;
  status: string;
  is_deprecated: boolean;
  vuln_count: number;
  vuln_severity: string | null;
  cve_ids: string[];
  days_behind: number;
  license: string | null;
  weekly_downloads: number | null;
  changelog_url: string | null;
}

interface Project {
  id: number;
  name: string;
  github_repo: string;
  default_branch: string;
  last_scanned_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  up_to_date:  { label: 'Up to date',  icon: <CheckCircle2 className="size-3.5" />, className: 'text-green-600 dark:text-green-400' },
  patch:       { label: 'Patch',       icon: <ArrowUpCircle className="size-3.5" />, className: 'text-blue-600 dark:text-blue-400' },
  minor:       { label: 'Minor',       icon: <ArrowUpCircle className="size-3.5" />, className: 'text-amber-600 dark:text-amber-400' },
  major:       { label: 'Major',       icon: <ArrowUpCircle className="size-3.5" />, className: 'text-orange-600 dark:text-orange-400' },
  vulnerable:  { label: 'Vulnerable',  icon: <ShieldAlert className="size-3.5" />,  className: 'text-destructive' },
  deprecated:  { label: 'Deprecated',  icon: <AlertTriangle className="size-3.5" />, className: 'text-muted-foreground' },
};

const SLA_CONFIG = [
  { maxDays: 30,  label: null,       className: '' },
  { maxDays: 90,  label: '1 month',  className: 'text-amber-500' },
  { maxDays: 180, label: '3 months', className: 'text-orange-500' },
  { maxDays: Infinity, label: '6+ months', className: 'text-destructive font-semibold' },
];

function getSlaClass(days: number) {
  const entry = SLA_CONFIG.find((c) => days <= c.maxDays);
  return entry ?? SLA_CONFIG[SLA_CONFIG.length - 1];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'days_behind'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    const [proj, depsData] = await Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/dependencies`).then((r) => r.json()),
    ]);
    setProject(proj);
    setDeps(Array.isArray(depsData) ? depsData : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function rescan() {
    setScanning(true);
    await fetch(`/api/projects/${id}/scan`, { method: 'POST' });
    await fetchData();
    setScanning(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!project) return <div className="p-6 text-sm text-muted-foreground">Project not found.</div>;

  const vulnerable  = deps.filter((d) => d.status === 'vulnerable');
  const outdated    = deps.filter((d) => ['major', 'minor', 'patch'].includes(d.status));
  const deprecated  = deps.filter((d) => d.is_deprecated);

  function sortAndFilter(list: Dependency[]) {
    const filtered = search ? list.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : list;
    return [...filtered].sort((a, b) => {
      const STATUS_ORDER: Record<string, number> = { vulnerable: 0, deprecated: 1, major: 2, minor: 3, patch: 4, up_to_date: 5 };
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'status') cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      else if (sortKey === 'days_behind') cmp = a.days_behind - b.days_behind;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const donutSlices = [
    { value: deps.filter((d) => d.status === 'up_to_date').length, color: '#22c55e', label: 'Up to date' },
    { value: deps.filter((d) => d.status === 'patch').length,      color: '#3b82f6', label: 'Patch' },
    { value: deps.filter((d) => d.status === 'minor').length,      color: '#f59e0b', label: 'Minor' },
    { value: deps.filter((d) => d.status === 'major').length,      color: '#f97316', label: 'Major' },
    { value: vulnerable.length,                                     color: '#ef4444', label: 'Vulnerable' },
  ].filter((s) => s.value > 0);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Link href="/projects" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Projects
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
              <a
                href={`https://github.com/${project.github_repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {project.github_repo} <ExternalLink className="size-3" />
              </a>
              {project.last_scanned_at && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Last scanned {formatDistanceToNow(new Date(project.last_scanned_at))}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={rescan} disabled={scanning}>
              <RefreshCw className={cn('size-4', scanning && 'animate-spin')} />
              {scanning ? 'Scanning…' : 'Rescan'}
            </Button>
          </div>

          {/* Summary stats + donut + health */}
          <div className="flex gap-3">
            <div className="grid flex-1 grid-cols-4 gap-3">
              {[
                { label: 'Total',      value: deps.length,       color: 'text-foreground' },
                { label: 'Vulnerable', value: vulnerable.length,  color: vulnerable.length  > 0 ? 'text-destructive' : 'text-foreground' },
                { label: 'Outdated',   value: outdated.length,    color: outdated.length   > 0 ? 'text-amber-500'   : 'text-foreground' },
                { label: 'Deprecated', value: deprecated.length,  color: deprecated.length > 0 ? 'text-orange-500' : 'text-foreground' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center rounded-xl border border-border bg-card py-3">
                  <span className={cn('text-2xl font-bold', s.color)}>{s.value}</span>
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            {donutSlices.length > 0 && (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3">
                <DonutChart
                  slices={donutSlices}
                  size={72}
                  thickness={10}
                  centerLabel={<span className="text-[10px] font-semibold text-muted-foreground">{deps.length}</span>}
                />
                <div className="flex flex-col gap-1">
                  {donutSlices.map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
                      <span className="text-[10px] font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <HealthBadge
              size="lg"
              depCount={deps.length}
              vulnCount={vulnerable.length}
              outdatedCount={outdated.length}
              deprecatedCount={deprecated.length}
            />
          </div>
        </div>

        {/* Tabs */}
        {deps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm font-medium text-foreground">No dependencies found</p>
            <p className="mt-1 text-xs text-muted-foreground">Click Rescan to detect your project's dependencies.</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All <Badge count={sortAndFilter(deps).length} /></TabsTrigger>
                <TabsTrigger value="vulnerable">Vulnerable <Badge count={vulnerable.length} danger /></TabsTrigger>
                <TabsTrigger value="outdated">Outdated <Badge count={outdated.length} warn /></TabsTrigger>
                <TabsTrigger value="deprecated">Deprecated <Badge count={deprecated.length} /></TabsTrigger>
              </TabsList>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search packages…"
                  className="h-8 pl-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {[
              { value: 'all',        rows: deps },
              { value: 'vulnerable', rows: vulnerable },
              { value: 'outdated',   rows: outdated },
              { value: 'deprecated', rows: deprecated },
            ].map(({ value, rows }) => (
              <TabsContent key={value} value={value} className="mt-4">
                <DependencyTable deps={sortAndFilter(rows)} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </TooltipProvider>
  );
}

function Badge({ count, warn, danger }: { count: number; warn?: boolean; danger?: boolean }) {
  if (count === 0) return null;
  return (
    <span className={cn(
      'ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
      danger ? 'bg-destructive/10 text-destructive' : warn ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground',
    )}>
      {count}
    </span>
  );
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M/wk`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k/wk`;
  return `${n}/wk`;
}

function SortHeader({ label, sortKey: key, currentKey, dir, onSort }: {
  label: React.ReactNode; sortKey: string; currentKey: string; dir: 'asc' | 'desc'; onSort: (k: 'name' | 'status' | 'days_behind') => void;
}) {
  const active = currentKey === key;
  return (
    <button onClick={() => onSort(key as 'name' | 'status' | 'days_behind')}
      className={cn('flex items-center gap-1 hover:text-foreground transition-colors', active ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
      {label}
      {active && <span className="text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}

function DependencyTable({ deps, sortKey, sortDir, onSort }: {
  deps: Dependency[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (k: 'name' | 'status' | 'days_behind') => void;
}) {
  if (deps.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortHeader label="Package" sortKey="name" currentKey={sortKey} dir={sortDir} onSort={onSort} /></TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead><SortHeader label="Status" sortKey="status" currentKey={sortKey} dir={sortDir} onSort={onSort} /></TableHead>
            <TableHead><SortHeader label="SLA" sortKey="days_behind" currentKey={sortKey} dir={sortDir} onSort={onSort} /></TableHead>
            <TableHead>License</TableHead>
            <TableHead>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Sparkles className="size-3 text-primary" />
                    Summary
                  </span>
                </TooltipTrigger>
                <TooltipContent>AI-powered migration summaries — coming soon</TooltipContent>
              </Tooltip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deps.map((dep) => {
            const cfg = STATUS_CONFIG[dep.status] ?? STATUS_CONFIG.up_to_date;
            const sla = dep.days_behind > 0 ? getSlaClass(dep.days_behind) : null;
            const cveIds: string[] = Array.isArray(dep.cve_ids) ? dep.cve_ids : [];

            return (
              <TableRow key={dep.id}>
                {/* Package */}
                <TableCell className="font-mono text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {dep.changelog_url ? (
                      <a href={dep.changelog_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {dep.name}
                      </a>
                    ) : (
                      <span>{dep.name}</span>
                    )}
                    {dep.changelog_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a href={dep.changelog_url} target="_blank" rel="noopener noreferrer">
                            <BookOpen className="size-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>View changelog</TooltipContent>
                      </Tooltip>
                    )}
                    {dep.weekly_downloads != null && (
                      <span className="text-[10px] text-muted-foreground/60 hidden xl:inline">
                        {formatDownloads(dep.weekly_downloads)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Current */}
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dep.current_version ?? '—'}
                </TableCell>

                {/* Latest */}
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dep.latest_version ?? '—'}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn('flex items-center gap-1 text-xs font-medium w-fit', cfg.className)}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{cfg.label}</TooltipContent>
                    </Tooltip>
                    {dep.vuln_count > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="rounded bg-destructive/10 px-1 py-0.5 text-[10px] font-medium text-destructive">
                          {dep.vuln_severity}
                        </span>
                        {cveIds.slice(0, 2).map((cve) => (
                          <a
                            key={cve}
                            href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-destructive/5 px-1 py-0.5 text-[10px] text-destructive hover:underline"
                          >
                            {cve}
                          </a>
                        ))}
                        {cveIds.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{cveIds.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* SLA */}
                <TableCell className={cn('text-xs', sla?.className ?? 'text-muted-foreground')}>
                  {dep.days_behind > 0 ? `${dep.days_behind}d` : '—'}
                </TableCell>

                {/* License */}
                <TableCell className="text-[11px] text-muted-foreground">
                  {dep.license ?? '—'}
                </TableCell>

                {/* AI Summary — coming soon */}
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-default items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary/60">
                        <Sparkles className="size-2.5" />
                        AI Summary
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      AI-powered migration guide coming soon — will summarize breaking changes and suggest code fixes
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

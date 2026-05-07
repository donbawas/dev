'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, ExternalLink, Loader2, ShieldAlert, ArrowUpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  days_behind: number;
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

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = useCallback(async () => {
    const [proj, depsData] = await Promise.all([
      fetch(`/api/projects/${params.id}`).then((r) => r.json()),
      fetch(`/api/projects/${params.id}/dependencies`).then((r) => r.json()),
    ]);
    setProject(proj);
    setDeps(Array.isArray(depsData) ? depsData : []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function rescan() {
    setScanning(true);
    await fetch(`/api/projects/${params.id}/scan`, { method: 'POST' });
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
  const upToDate    = deps.filter((d) => d.status === 'up_to_date');

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

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total',      value: deps.length,       className: 'text-foreground' },
              { label: 'Vulnerable', value: vulnerable.length,  className: vulnerable.length  > 0 ? 'text-destructive' : 'text-foreground' },
              { label: 'Outdated',   value: outdated.length,    className: outdated.length   > 0 ? 'text-amber-500'   : 'text-foreground' },
              { label: 'Deprecated', value: deprecated.length,  className: deprecated.length > 0 ? 'text-muted-foreground' : 'text-foreground' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center rounded-xl border border-border bg-card py-3">
                <span className={cn('text-2xl font-bold', s.className)}>{s.value}</span>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
            ))}
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
            <TabsList>
              <TabsTrigger value="all">All <Badge count={deps.length} /></TabsTrigger>
              <TabsTrigger value="vulnerable">Vulnerable <Badge count={vulnerable.length} danger /></TabsTrigger>
              <TabsTrigger value="outdated">Outdated <Badge count={outdated.length} warn /></TabsTrigger>
              <TabsTrigger value="deprecated">Deprecated <Badge count={deprecated.length} /></TabsTrigger>
            </TabsList>

            {[
              { value: 'all',        rows: deps },
              { value: 'vulnerable', rows: vulnerable },
              { value: 'outdated',   rows: outdated },
              { value: 'deprecated', rows: deprecated },
            ].map(({ value, rows }) => (
              <TabsContent key={value} value={value} className="mt-4">
                <DependencyTable deps={rows} />
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

function DependencyTable({ deps }: { deps: Dependency[] }) {
  if (deps.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package</TableHead>
            <TableHead>Current</TableHead>
            <TableHead>Latest</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deps.map((dep) => {
            const cfg = STATUS_CONFIG[dep.status] ?? STATUS_CONFIG.up_to_date;
            const sla = dep.days_behind > 0 ? getSlaClass(dep.days_behind) : null;

            return (
              <TableRow key={dep.id}>
                <TableCell className="font-mono text-sm font-medium">
                  <a
                    href={`https://www.npmjs.com/package/${dep.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {dep.name}
                  </a>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dep.current_version ?? '—'}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {dep.latest_version ?? '—'}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className={cn('flex items-center gap-1 text-xs font-medium', cfg.className)}>
                        {cfg.icon} {cfg.label}
                        {dep.vuln_count > 0 && (
                          <span className="ml-1 rounded bg-destructive/10 px-1 py-0.5 text-[10px] text-destructive">
                            {dep.vuln_count} {dep.vuln_severity}
                          </span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {dep.vuln_count > 0
                        ? `${dep.vuln_count} known vulnerability${dep.vuln_count > 1 ? 'ies' : 'y'} (${dep.vuln_severity})`
                        : cfg.label}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className={cn('text-xs', sla?.className ?? 'text-muted-foreground')}>
                  {dep.days_behind > 0 ? `${dep.days_behind}d` : '—'}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground capitalize">
                  {dep.dep_type}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

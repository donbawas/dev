'use client';

import { useState, useEffect } from 'react';
import { Plus, GitBranch, ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PricingModal } from '@/components/pricing-modal';
import { AddProjectDialog } from '@/components/projects/add-project-dialog';
import { HealthBadge } from '@/components/projects/health-badge';
import { formatDistanceToNow } from '@/lib/date';

interface Project {
  id: number;
  name: string;
  github_repo: string;
  default_branch: string;
  last_scanned_at: string | null;
  dep_count: number;
  vuln_count: number;
  outdated_count: number;
  deprecated_count: number;
}

export default function ProjectsPage() {
  const [plan, setPlan] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/user/plan').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([planData, projectsData]) => {
      setPlan(planData.plan ?? 'free');
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setLoading(false);
    });
  }, []);

  // Show pricing modal immediately if free plan
  useEffect(() => {
    if (plan === 'free') setShowPricing(true);
  }, [plan]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Track dependencies, vulnerabilities and version SLAs across your apps
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => plan === 'free' ? setShowPricing(true) : setShowAdd(true)}
        >
          <Plus className="size-4" /> Add project
        </Button>
      </div>

      {plan === 'free' ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <ShieldAlert className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Projects is a Pro feature</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Upgrade to track your app's dependencies, get vulnerability alerts, and monitor version SLAs.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowPricing(true)}>
            View plans
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <GitBranch className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your first GitHub repository to start tracking dependencies.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" /> Add project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />
      <AddProjectDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(p) => setProjects((prev) => [p as Project, ...prev])}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const hasIssues = project.vuln_count > 0 || project.outdated_count > 0;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{project.github_repo}</p>
        </div>
        <HealthBadge
          depCount={project.dep_count}
          vulnCount={project.vuln_count}
          outdatedCount={project.outdated_count}
          deprecatedCount={project.deprecated_count}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total"      value={project.dep_count}      />
        <Stat label="Outdated"   value={project.outdated_count}  warn={project.outdated_count > 0} />
        <Stat label="Vulnerable" value={project.vuln_count}      danger={project.vuln_count > 0} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {project.last_scanned_at
          ? `Scanned ${formatDistanceToNow(new Date(project.last_scanned_at))}`
          : 'Not scanned yet'}
      </p>
    </Link>
  );
}

function Stat({ label, value, warn, danger }: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-2">
      <span className={`text-lg font-bold ${danger ? 'text-destructive' : warn ? 'text-amber-500' : 'text-foreground'}`}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { SOURCE_TYPE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/date';
import { cn } from '@/lib/utils';

interface TopicRequest {
  id: number;
  name: string;
  source_type: string;
  source_identifier: string;
  category_name: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requester_name: string | null;
  requester_email: string;
  rejection_reason: string | null;
  created_at: string;
}

interface AdminTopic {
  id: number;
  name: string;
  source_type: string;
  source_identifier: string;
  category_name: string | null;
  verified: boolean;
  subscriber_count: number;
  last_fetched_at: string | null;
}

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [requests, setRequests] = useState<TopicRequest[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/plan')
      .then((r) => r.json())
      .then((data) => {
        if (data.role !== 'admin') { redirect('/'); return; }
        setRole('admin');
        return Promise.all([
          fetch('/api/topic-requests').then((r) => r.json()),
          fetch('/api/admin/topics').then((r) => r.json()),
        ]);
      })
      .then((results) => {
        if (!results) return;
        const [reqs, tops] = results;
        setRequests(Array.isArray(reqs) ? reqs : []);
        setTopics(Array.isArray(tops) ? tops : []);
        setLoading(false);
      });
  }, []);

  async function handleRequest(id: number, action: 'approve' | 'reject') {
    setActionLoading(id);
    try {
      await fetch(`/api/topic-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setRequests((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)
      );
      if (action === 'approve') {
        const res = await fetch('/api/admin/topics').then((r) => r.json());
        setTopics(Array.isArray(res) ? res : []);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerify(id: number, verified: boolean) {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      setTopics((prev) => prev.map((t) => t.id === id ? { ...t, verified } : t));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading || role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage topic requests and verified topics</p>
        </div>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="gap-1.5">
            Requests
            {pending.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>

        {/* ── Requests tab ── */}
        <TabsContent value="requests" className="mt-4">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Clock className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No requests yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pending — {pending.length}
                </p>
              )}
              {pending.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  loading={actionLoading === r.id}
                  onApprove={() => handleRequest(r.id, 'approve')}
                  onReject={() => handleRequest(r.id, 'reject')}
                />
              ))}

              {reviewed.length > 0 && (
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reviewed — {reviewed.length}
                </p>
              )}
              {reviewed.map((r) => (
                <RequestCard key={r.id} request={r} loading={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Topics tab ── */}
        <TabsContent value="topics" className="mt-4">
          <div className="flex flex-col gap-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors',
                  !t.verified && 'opacity-60',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{t.name}</span>
                    {t.verified && <CheckCircle2 className="size-3.5 text-primary" />}
                    {t.category_name && (
                      <span className="text-[10px] text-muted-foreground">{t.category_name}</span>
                    )}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {SOURCE_TYPE_LABELS[t.source_type as keyof typeof SOURCE_TYPE_LABELS]} · {t.source_identifier}
                    {t.subscriber_count > 0 && ` · ${t.subscriber_count} subscribers`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={t.verified ? 'outline' : 'default'}
                  className="shrink-0 gap-1.5"
                  disabled={actionLoading === t.id}
                  onClick={() => handleVerify(t.id, !t.verified)}
                >
                  {actionLoading === t.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : t.verified ? (
                    <><EyeOff className="size-3.5" /> Unverify</>
                  ) : (
                    <><Eye className="size-3.5" /> Verify</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestCard({ request: r, loading, onApprove, onReject }: {
  request: TopicRequest;
  loading: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const statusColor = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }[r.status];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{r.name}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize', statusColor)}>
              {r.status}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {SOURCE_TYPE_LABELS[r.source_type as keyof typeof SOURCE_TYPE_LABELS]} · {r.source_identifier}
            {r.category_name && ` · ${r.category_name}`}
          </span>
          {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="text-xs font-medium text-foreground">{r.requester_name ?? r.requester_email}</span>
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at))}</span>
        </div>
      </div>

      {r.status === 'pending' && onApprove && onReject && (
        <div className="flex gap-2 border-t border-border pt-3">
          <Button size="sm" className="gap-1.5" disabled={loading} onClick={onApprove}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Approve
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={loading} onClick={onReject}>
            <XCircle className="size-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

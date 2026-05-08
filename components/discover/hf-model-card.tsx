'use client';

import { Download, Heart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from '@/lib/date';
import type { HFModel } from '@/app/api/huggingface/search/route';

interface Props {
  model: HFModel;
  onTrack: (model: HFModel) => void;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const PIPELINE_LABELS: Record<string, string> = {
  'text-generation':          'Text generation',
  'text2text-generation':     'Text2Text',
  'image-classification':     'Image classification',
  'image-to-text':            'Image to text',
  'text-to-image':            'Text to image',
  'automatic-speech-recognition': 'Speech recognition',
  'token-classification':     'Token classification',
  'question-answering':       'Q&A',
  'summarization':            'Summarization',
  'translation':              'Translation',
  'fill-mask':                'Fill mask',
  'feature-extraction':       'Feature extraction',
};

export function HFModelCard({ model, onTrack }: Props) {
  const updatedAgo = formatDistanceToNow(new Date(model.lastModified));
  const pipelineLabel = model.pipeline_tag ? (PIPELINE_LABELS[model.pipeline_tag] ?? model.pipeline_tag) : null;
  const visibleTags = model.tags.filter((t) => !t.startsWith('license:') && t !== model.pipeline_tag).slice(0, 3);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={`https://huggingface.co/${model.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-semibold text-card-foreground hover:underline"
          >
            <span className="truncate">{model.id}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          {pipelineLabel && (
            <p className="mt-1 text-xs text-muted-foreground">{pipelineLabel}</p>
          )}
        </div>
      </div>

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download className="size-3" />
          {formatCount(model.downloads)}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="size-3" />
          {formatCount(model.likes)}
        </span>
        <span>updated {updatedAgo}</span>
      </div>

      <Button size="sm" variant="outline" className="mt-auto w-full" onClick={() => onTrack(model)}>
        Track this
      </Button>
    </div>
  );
}

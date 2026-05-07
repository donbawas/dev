export type SourceType = 'github' | 'npm' | 'rss' | 'url' | 'pypi' | 'huggingface';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  github: 'GitHub',
  npm: 'npm',
  rss: 'RSS Feed',
  url: 'Website',
  pypi: 'PyPI',
  huggingface: 'Hugging Face',
};

export const SOURCE_TYPE_PLACEHOLDER: Record<SourceType, string> = {
  github: 'e.g. vercel/next.js',
  npm: 'e.g. next',
  rss: 'e.g. https://blog.example.com/feed.xml',
  url: 'e.g. https://example.com/releases',
  pypi: 'e.g. fastapi',
  huggingface: 'e.g. meta-llama/Llama-3',
};

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Topic {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  source_type: SourceType;
  source_identifier: string;
  verified: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface CategoryWithTopics extends Category {
  topics: Topic[];
}

export type UpdateType = 'release' | 'announcement' | 'security' | 'article' | 'discussion' | 'other';

export const UPDATE_TYPE_LABELS: Record<UpdateType, string> = {
  release:      'Release',
  announcement: 'Announcement',
  security:     'Security',
  article:      'Article',
  discussion:   'Discussion',
  other:        'Update',
};

export const UPDATE_TYPE_COLORS: Record<UpdateType, string> = {
  release:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  announcement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  security:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  article:      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  discussion:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  other:        'bg-muted text-muted-foreground',
};

export interface Update {
  id: number;
  topic_id: number;
  title: string;
  url: string | null;
  description: string | null;
  update_type: UpdateType;
  published_at: string | null;
  created_at: string;
}

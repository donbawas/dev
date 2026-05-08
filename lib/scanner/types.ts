export type Ecosystem = 'npm' | 'pypi' | 'cargo' | 'go' | 'rubygems';

export type DepType = 'production' | 'dev' | 'peer';

export type DepStatus = 'up_to_date' | 'patch' | 'minor' | 'major' | 'vulnerable' | 'deprecated';

export interface RawDep {
  name: string;
  currentVersion: string;
  type: DepType;
  ecosystem: Ecosystem;
}

export interface EnrichedDep extends RawDep {
  latestVersion: string;
  isDeprecated: boolean;
  publishedAt: string | null;
  vulnCount: number;
  vulnSeverity: string | null;
  cveIds: string[];
  status: DepStatus;
  daysBehind: number;
  license: string | null;
  weeklyDownloads: number | null;
  changelogUrl: string;
}

export interface ManifestFile {
  path: string;
  ecosystem: Ecosystem;
  content: string;
}

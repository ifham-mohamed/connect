export type SourceKind =
  | "topjobs"
  | "xpressjobs"
  | "jobeka"
  | "itpro"
  | "rooster"
  | "neojobs"
  | "jobster"
  | "devjobs"
  | "remotive"
  | "arbeitnow"
  | "greenhouse"
  | "lever";
export type JobStatus = "new" | "saved" | "applied" | "archived";
export interface Job {
  id: string;
  externalId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  salary: string;
  tags: string[];
  description: string;
  url: string;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: JobStatus;
  active: boolean;
  matchedMonitors: string[];
}
export interface Monitor {
  id: string;
  userId?: string;
  name: string;
  keywords: string[];
  excludedKeywords: string[];
  location: string;
  remoteOnly: boolean;
  enabled: boolean;
  createdAt: string;
}
export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  board: string;
  enabled: boolean;
  intervalMinutes: number;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  jobCount: number;
}
export interface Run {
  id: string;
  sourceName: string;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "failed" | "running";
  fetched: number;
  added: number;
  error: string | null;
}
export interface DashboardData {
  mode: "demo" | "live";
  jobs: Job[];
  monitors: Monitor[];
  sources: Source[];
  runs: Run[];
  authenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: "owner" | "member";
    onboardingCompleted: boolean;
  } | null;
}

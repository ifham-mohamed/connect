"use client";
import {
  SettingsCardSkeleton,
  WorkspaceContentSkeleton,
} from "@/components/workspace-content-skeleton";
import type { Job, Monitor, SourceKind } from "@/lib/types";
import {
  Activity,
  Bookmark,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  Link2,
  Radio,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
export const CvWorkspace = dynamic(() => import("@/components/cv-workspace"), {
  loading: () => <WorkspaceContentSkeleton kind="cv" />,
});

export const IntelligenceControls = dynamic(
  () => import("@/components/intelligence-controls"),
  { loading: () => <WorkspaceContentSkeleton kind="intelligence" /> },
);

export const JobCvReview = dynamic(() => import("@/components/job-cv-review"));

export const JobImageContext = dynamic(
  () => import("@/components/job-image-context"),
);

export const SecurityActivity = dynamic(
  () => import("@/components/security-activity"),
  { loading: () => <SettingsCardSkeleton /> },
);

export const AiUsageControls = dynamic(
  () => import("@/components/ai-usage-controls"),
  {
    loading: () => <SettingsCardSkeleton />,
  },
);

export const PerformanceCostPanel = dynamic(
  () => import("@/components/performance-cost-panel"),
  { loading: () => <SettingsCardSkeleton /> },
);

export type Revisions = Record<string, number>;

export type View =
  | "overview"
  | "jobs"
  | "saved"
  | "monitors"
  | "sources"
  | "activity"
  | "cv"
  | "intelligence"
  | "settings";

export type Modal =
  | { type: "monitor"; monitor?: Monitor }
  | { type: "source" }
  | { type: "job"; job: Job }
  | { type: "help" }
  | null;

export type Theme = "light" | "dark";

export const viewPaths: Record<View, string> = {
  overview: "/app/dashboard",
  jobs: "/app/jobs",
  saved: "/app/saved",
  monitors: "/app/monitors",
  sources: "/app/sources",
  activity: "/app/activity",
  cv: "/app/profile/cv",
  intelligence: "/app/intelligence",
  settings: "/app/settings",
};

export const pathViews = Object.fromEntries(
  Object.entries(viewPaths).map(([key, value]) => [value, key as View]),
) as Record<string, View>;

export const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "jobs", label: "All opportunities", icon: BriefcaseBusiness },
  { id: "saved", label: "Saved jobs", icon: Bookmark },
  { id: "monitors", label: "My monitors", icon: Radio },
  { id: "sources", label: "Connected sources", icon: Link2 },
  { id: "activity", label: "Activity log", icon: Activity },
  { id: "cv", label: "My CV", icon: FileText },
  { id: "intelligence", label: "AI controls", icon: Sparkles },
] as const;

export const titles: Record<View, [string, string]> = {
  overview: [
    "Role matches for Sri Lanka and remote work.",
    "Focused monitors for full-stack and software engineering roles.",
  ],
  jobs: [
    "Review collected openings.",
    "Filter by role, monitor, source, and location without losing the original listing.",
  ],
  saved: [
    "Your application shortlist.",
    "Saved and applied roles stay here for follow-up.",
  ],
  monitors: [
    "CV-aligned monitors.",
    "Track full-stack, software engineer, software developer, and associate roles.",
  ],
  sources: [
    "Source coverage.",
    "Connected feeds and employer boards with preserved publication records.",
  ],
  activity: [
    "Collection history.",
    "Recent source checks, imported records, and errors.",
  ],
  cv: [
    "Your career story, clearly organized.",
    "Review your experience and skills, then save the approved profile to your private account.",
  ],
  intelligence: [
    "AI review and rollout.",
    "Audit JEV evaluations and manage the rules that can affect matching.",
  ],
  settings: [
    "Workspace settings.",
    "Profile, preferences, privacy, and workspace access.",
  ],
};

export const kindNames: Record<SourceKind, string> = {
  itpro: "ITPro.lk",
  topjobs: "TopJobs",
  xpressjobs: "XpressJobs",
  jobeka: "JobEka",
  rooster: "Rooster Jobs",
  neojobs: "Neo Jobs",
  jobster: "Jobster",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  greenhouse: "Greenhouse",
  lever: "Lever",
};

export const experienceNames = {
  internship: "Internship",
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  other: "Other / unspecified",
} as const;

export function timeAgo(value: string | null) {
  if (!value) return "Not yet";
  const hours = Math.max(0, (Date.now() - new Date(value).getTime()) / 3600000);
  return hours < 1
    ? `${Math.max(1, Math.floor(hours * 60))}m ago`
    : hours < 24
      ? `${Math.floor(hours)}h ago`
      : `${Math.floor(hours / 24)}d ago`;
}

export function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not supplied by source";
}

export function initials(value: string) {
  return value
    .split(/\s/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function companyColor(value: string) {
  return ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e"][
    Array.from(value).reduce((n, c) => n + c.charCodeAt(0), 0) % 5
  ];
}

export function LinkedInMark() {
  return (
    <span className="linkedin-mark" aria-hidden="true">
      in
    </span>
  );
}

export function accountInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react";
import type {
  DashboardData,
  Job,
  JobStatus,
  Monitor,
  SourceKind,
} from "@/lib/types";
import { matchesMonitor } from "@/lib/matching";
import { monitorSchema, sourceSchema } from "@/lib/validation";
import {
  linkedInJobPostsSearchUrl,
  linkedInJobsSearchUrl,
  linkedInNetworkJobsSearchUrl,
  type LinkedInDatePosted,
  type LinkedInDistance,
  type LinkedInExperience,
  type LinkedInJobType,
  type LinkedInSort,
  type LinkedInWorkplace,
} from "@/lib/linkedin";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

type View =
  | "overview"
  | "jobs"
  | "saved"
  | "monitors"
  | "sources"
  | "activity"
  | "settings";
type Modal =
  | { type: "monitor"; monitor?: Monitor }
  | { type: "source" }
  | { type: "job"; job: Job }
  | { type: "login" }
  | { type: "help" }
  | null;
type Theme = "light" | "dark";
const viewPaths: Record<View, string> = {
  overview: "/",
  jobs: "/jobs",
  saved: "/saved",
  monitors: "/monitors",
  sources: "/sources",
  activity: "/activity",
  settings: "/settings",
};
const pathViews = Object.fromEntries(
  Object.entries(viewPaths).map(([key, value]) => [value, key as View]),
) as Record<string, View>;
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "jobs", label: "All opportunities", icon: BriefcaseBusiness },
  { id: "saved", label: "Saved jobs", icon: Bookmark },
  { id: "monitors", label: "My monitors", icon: Radio },
  { id: "sources", label: "Connected sources", icon: Link2 },
  { id: "activity", label: "Activity log", icon: Activity },
] as const;
const titles: Record<View, [string, string]> = {
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
  settings: [
    "Workspace settings.",
    "Connection status, access, and operational details.",
  ],
};
const kindNames: Record<SourceKind, string> = {
  itpro: "ITPro.lk",
  topjobs: "TopJobs",
  xpressjobs: "XpressJobs",
  jobeka: "JobEka",
  rooster: "Rooster Jobs",
  neojobs: "Neo Jobs",
  jobster: "Jobster",
  devjobs: "DevJobs",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  greenhouse: "Greenhouse",
  lever: "Lever",
};
function timeAgo(value: string | null) {
  if (!value) return "Not yet";
  const hours = Math.max(0, (Date.now() - new Date(value).getTime()) / 3600000);
  return hours < 1
    ? `${Math.max(1, Math.floor(hours * 60))}m ago`
    : hours < 24
      ? `${Math.floor(hours)}h ago`
      : `${Math.floor(hours / 24)}d ago`;
}
function dateTime(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not supplied by source";
}
function initials(value: string) {
  return value
    .split(/\s/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function companyColor(value: string) {
  return ["tone-a", "tone-b", "tone-c", "tone-d", "tone-e"][
    Array.from(value).reduce((n, c) => n + c.charCodeAt(0), 0) % 5
  ];
}
function LinkedInMark() {
  return (
    <span className="linkedin-mark" aria-hidden="true">
      in
    </span>
  );
}

export default function Dashboard({ initialView = "overview" }: { initialView?: View }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [monitorFilter, setMonitorFilter] = useState("all");
  const [tab, setTab] = useState(initialView === "jobs" ? "matched" : "all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [filters, setFilters] = useState(false);
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [linkedInQuery, setLinkedInQuery] = useState("");
  const [linkedInLocation, setLinkedInLocation] = useState("");
  const [linkedInWorkplace, setLinkedInWorkplace] =
    useState<LinkedInWorkplace>("any");
  const [linkedInExperience, setLinkedInExperience] =
    useState<LinkedInExperience>("any");
  const [linkedInJobType, setLinkedInJobType] =
    useState<LinkedInJobType>("any");
  const [linkedInDatePosted, setLinkedInDatePosted] =
    useState<LinkedInDatePosted>("week");
  const [linkedInSort, setLinkedInSort] =
    useState<LinkedInSort>("relevant");
  const [linkedInDistance, setLinkedInDistance] =
    useState<LinkedInDistance>("25");
  const [linkedInEasyApply, setLinkedInEasyApply] = useState(false);
  const [linkedInUnderTen, setLinkedInUnderTen] = useState(false);
  const [modal, setModalState] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("jobradar-sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = localStorage.getItem("jobradar-theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);
  const modalHistoryRef = useRef(false);
  const refresh = useCallback(async () => {
    if (hasLoadedRef.current) setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.mode === "demo") {
        try {
          const saved = localStorage.getItem("jobradar-demo-v2");
          if (saved) {
            const state = JSON.parse(saved);
            result.monitors = state.monitors || result.monitors;
            result.sources = state.sources || result.sources;
            result.jobs = result.jobs.map((j: Job) => ({
              ...j,
              status: state.statuses?.[j.id] || j.status,
            }));
          }
        } catch {
          /* Storage may be unavailable in private browsing. */
        }
      }
      setData(result);
      hasLoadedRef.current = true;
      setNow(Date.now());
      setError("");
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(
      () => refresh().catch((e) => setError(e.message)),
      0,
    );
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    try {
      localStorage.setItem("jobradar-theme", theme);
    } catch {
      /* The selected theme still applies for this session. */
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("jobradar-dark", theme === "dark");
    document.documentElement.classList.toggle("jobradar-light", theme === "light");
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "jobradar-sidebar",
        sidebarCollapsed ? "collapsed" : "expanded",
      );
    } catch {
      /* The selected sidebar state still applies for this session. */
    }
    document.documentElement.dataset.sidebar = sidebarCollapsed
      ? "collapsed"
      : "expanded";
    document.documentElement.classList.toggle(
      "jobradar-sidebar-collapsed",
      sidebarCollapsed,
    );
  }, [sidebarCollapsed]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const syncViewFromPath = (event: PopStateEvent) => {
      const historyModal = event.state?.jobradarModal as Modal | undefined;
      if (historyModal) {
        modalHistoryRef.current = true;
        setModalState(historyModal);
        setMobileNav(false);
        return;
      }
      if (modalHistoryRef.current) {
        modalHistoryRef.current = false;
        setModalState(null);
        setMobileNav(false);
        return;
      }
      const next = pathViews[window.location.pathname] || "overview";
      setModalState(null);
      setView(next);
      setTab(next === "jobs" ? "matched" : "all");
      setPage(1);
      setMonitorFilter("all");
      setQuery("");
      setRegion("all");
      setSourceFilter("all");
      setMobileNav(false);
    };
    window.addEventListener("popstate", syncViewFromPath);
    return () => window.removeEventListener("popstate", syncViewFromPath);
  }, []);
  const jobs = useMemo(
    () =>
      data?.jobs.map((j) => ({
        ...j,
        matchedMonitors: data.monitors
          .filter((m) => matchesMonitor(j, m))
          .map((m) => m.id),
      })) || [],
    [data],
  );
  const filtered = useMemo(
    () =>
      jobs
        .filter((j) => {
          const text =
            `${j.title} ${j.company} ${j.tags.join(" ")} ${j.location}`.toLowerCase();
          return (
            (!query || text.includes(query.toLowerCase())) &&
            (view === "saved"
              ? j.status === "saved" || j.status === "applied"
              : tab === "archived"
                ? j.status === "archived"
                : j.status !== "archived") &&
            (region === "all" ||
              (region === "remote"
                ? j.remote
                : /sri lanka|colombo|kandy|galle/i.test(j.location))) &&
            (sourceFilter === "all" || j.sourceId === sourceFilter) &&
            (monitorFilter === "all" ||
              j.matchedMonitors.includes(monitorFilter)) &&
            (tab !== "matched" || j.matchedMonitors.length > 0) &&
            (tab !== "new" || j.status === "new") &&
            (tab !== "applied" || j.status === "applied")
          );
        })
        .sort((a, b) =>
          sort === "company"
            ? a.company.localeCompare(b.company)
            : new Date(b.publishedAt || b.firstSeenAt).getTime() -
              new Date(a.publishedAt || a.firstSeenAt).getTime(),
        ),
    [jobs, query, view, region, sourceFilter, monitorFilter, tab, sort],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filtered.length);
  const paginatedJobs = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const queryText = query.trim().toLowerCase();
  const filteredMonitors = useMemo(
    () =>
      data?.monitors.filter((monitor) => {
        const text = `${monitor.name} ${monitor.keywords.join(" ")} ${monitor.excludedKeywords.join(" ")} ${monitor.location}`.toLowerCase();
        return (
          (!queryText || text.includes(queryText)) &&
          (workspaceFilter === "all" ||
            (workspaceFilter === "enabled" ? monitor.enabled : !monitor.enabled))
        );
      }) || [],
    [data?.monitors, queryText, workspaceFilter],
  );
  const filteredSources = useMemo(
    () =>
      data?.sources.filter((source) => {
        const text = `${source.name} ${kindNames[source.kind]} ${source.board}`.toLowerCase();
        return (
          (!queryText || text.includes(queryText)) &&
          (workspaceFilter === "all" ||
            (workspaceFilter === "connected"
              ? source.enabled && !source.lastError
              : workspaceFilter === "paused"
                ? !source.enabled
                : Boolean(source.lastError)))
        );
      }) || [],
    [data?.sources, queryText, workspaceFilter],
  );
  const filteredRuns = useMemo(
    () =>
      data?.runs.filter((run) => {
        const text = `${run.sourceName} ${run.status} ${run.error || ""}`.toLowerCase();
        return (
          (!queryText || text.includes(queryText)) &&
          (workspaceFilter === "all" || run.status === workspaceFilter)
        );
      }) || [],
    [data?.runs, queryText, workspaceFilter],
  );
  const monitorPage = Math.min(page, Math.max(1, Math.ceil(filteredMonitors.length / pageSize)));
  const sourcePage = Math.min(page, Math.max(1, Math.ceil(filteredSources.length / pageSize)));
  const runPage = Math.min(page, Math.max(1, Math.ceil(filteredRuns.length / pageSize)));
  const paginatedMonitors = filteredMonitors.slice((monitorPage - 1) * pageSize, monitorPage * pageSize);
  const paginatedSources = filteredSources.slice((sourcePage - 1) * pageSize, sourcePage * pageSize);
  const paginatedRuns = filteredRuns.slice((runPage - 1) * pageSize, runPage * pageSize);

  function navigate(next: View, event?: React.MouseEvent<HTMLElement>) {
    event?.preventDefault();
    setView(next);
    setTab(next === "jobs" ? "matched" : "all");
    setPage(1);
    setMonitorFilter("all");
    setQuery("");
    setRegion("all");
    setSourceFilter("all");
    setWorkspaceFilter("all");
    setMobileNav(false);
    if (typeof window !== "undefined" && window.location.pathname !== viewPaths[next]) {
      window.history.pushState({ view: next }, "", viewPaths[next]);
    }
  }
  function openModal(next: Exclude<Modal, null>) {
    if (typeof window !== "undefined") {
      const nextState = {
        ...(window.history.state || {}),
        jobradarModal: next,
      };
      if (modalHistoryRef.current) {
        window.history.replaceState(nextState, "", window.location.href);
      } else {
        window.history.pushState(nextState, "", window.location.href);
        modalHistoryRef.current = true;
      }
    }
    setModalState(next);
  }
  function closeModal(replaceHistory = false) {
    setModalState(null);
    if (typeof window === "undefined" || !modalHistoryRef.current) return;

    if (replaceHistory) {
      const nextState = { ...(window.history.state || {}) };
      delete nextState.jobradarModal;
      window.history.replaceState(nextState, "", window.location.href);
      modalHistoryRef.current = false;
      return;
    }
    window.history.back();
  }
  function focusMonitor(id: string) {
    navigate("jobs");
    setMonitorFilter(id);
    setFilters(true);
  }
  function saveDemo(next: DashboardData) {
    setData(next);
    try {
      localStorage.setItem(
        "jobradar-demo-v2",
        JSON.stringify({
          monitors: next.monitors,
          sources: next.sources,
          statuses: Object.fromEntries(next.jobs.map((j) => [j.id, j.status])),
        }),
      );
    } catch {
      setToast(
        "Changes are kept for this visit. Browser storage is unavailable.",
      );
    }
  }
  async function action(actionName: string, id?: string, value?: unknown) {
    if (!data) return;
    if (data.mode === "demo") {
      let next = { ...data };
      if (actionName === "job-status")
        next.jobs = data.jobs.map((j) =>
          j.id === id ? { ...j, status: value as JobStatus } : j,
        );
      if (actionName === "monitor-save") {
        const monitor = {
          ...(value as Omit<Monitor, "id" | "createdAt">),
          id: id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        next.monitors = id
          ? data.monitors.map((m) => (m.id === id ? monitor : m))
          : [...data.monitors, monitor];
      }
      if (actionName === "monitor-delete")
        next.monitors = data.monitors.filter((m) => m.id !== id);
      if (actionName === "source-toggle")
        next.sources = data.sources.map((s) =>
          s.id === id ? { ...s, enabled: value as boolean } : s,
        );
      if (actionName === "source-add") {
        const input = value as {
          name: string;
          kind: SourceKind;
          board: string;
        };
        if (
          data.sources.some(
            (s) => s.kind === input.kind && s.board === input.board,
          )
        )
          throw new Error("This source is already connected.");
        next = {
          ...next,
          sources: [
            ...data.sources,
            {
              ...input,
              id: crypto.randomUUID(),
              enabled: true,
              intervalMinutes: [
                "remotive",
                "arbeitnow",
                "jobeka",
                "jobster",
              ].includes(input.kind)
                ? 360
                : 60,
              jobCount: 0,
              lastAttemptAt: null,
              lastSyncedAt: null,
              lastError: null,
            },
          ],
        };
      }
      saveDemo(next);
      return;
    }
    if (!data.authenticated) {
      openModal({ type: "login" });
      throw new Error("Sign in to manage this workspace.");
    }
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, id, data: value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await refresh();
    return result;
  }
  async function changeStatus(job: Job, status: JobStatus) {
    try {
      await action("job-status", job.id, status);
      setToast(
        status === "saved"
          ? "Added to your saved jobs."
          : status === "applied"
            ? "Application recorded. Good luck!"
            : status === "archived"
              ? "Job archived."
              : "Job returned to your opportunities.",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  async function sync() {
    if (data?.mode === "demo") {
      setToast(
        "You’re exploring sample data. Connect PostgreSQL in Workspace settings to start collecting real jobs.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await action("sync");
      setToast(
        result?.busy
          ? "A collection is already running."
          : result?.results?.length
            ? `Checked ${result.results.length} sources. ${result.results.filter((r: { status: string }) => r.status === "failed").length} need attention.`
            : "All sources are up to date. Their next checks will run on schedule.",
      );
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportJobs() {
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = [
      [
        "Title",
        "Company",
        "Location",
        "Remote",
        "Source",
        "Published",
        "First seen",
        "Last seen",
        "Status",
        "URL",
      ],
      ...filtered.map((j) => [
        j.title,
        j.company,
        j.location,
        j.remote,
        j.sourceName,
        j.publishedAt,
        j.firstSeenAt,
        j.lastSeenAt,
        j.status,
        j.url,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobradar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${filtered.length} opportunities.`);
  }
  if (!data)
    return error ? (
      <div className="boot">
        <div className="brand">
          <span className="brand-icon">
            <Radio size={24} />
          </span>
          jobradar<span className="brand-dot">.</span>
        </div>
        <h2>Let’s reconnect your workspace.</h2>
        <p>{error}</p>
        <button
          className="btn primary"
          onClick={() => refresh().catch((e) => setError(e.message))}
        >
          Try again
        </button>
      </div>
    ) : (
      <DashboardSkeleton view={initialView} />
    );
  const activeMonitors = data.monitors.filter((m) => m.enabled);
  const jobViews = ["overview", "jobs", "saved"].includes(view);
  const linkedInMonitor =
    data.monitors.find((monitor) => monitor.id === monitorFilter) ||
    activeMonitors[0] ||
    data.monitors[0];
  const linkedInSearchUrl = linkedInJobsSearchUrl({
    monitor: linkedInMonitor,
    query: jobViews ? query : linkedInQuery,
    location:
      jobViews && region === "remote"
        ? "Worldwide"
        : jobViews && region === "sri-lanka"
          ? "Sri Lanka"
          : linkedInLocation,
    remoteOnly:
      (jobViews && region === "remote") || linkedInMonitor?.remoteOnly,
    workplace: jobViews ? "any" : linkedInWorkplace,
    experience: jobViews ? "any" : linkedInExperience,
    jobType: jobViews ? "any" : linkedInJobType,
    datePosted: jobViews ? "week" : linkedInDatePosted,
    sort: jobViews ? "relevant" : linkedInSort,
    distance: jobViews ? "25" : linkedInDistance,
    easyApply: !jobViews && linkedInEasyApply,
    underTenApplicants: !jobViews && linkedInUnderTen,
  });
  const linkedInNetworkSearchUrl = linkedInNetworkJobsSearchUrl({
    monitor: linkedInMonitor,
    query: jobViews ? query : linkedInQuery,
    location:
      jobViews && region === "remote"
        ? "Worldwide"
        : jobViews && region === "sri-lanka"
          ? "Sri Lanka"
          : linkedInLocation,
    remoteOnly:
      (jobViews && region === "remote") || linkedInMonitor?.remoteOnly,
    workplace: jobViews ? "any" : linkedInWorkplace,
    experience: jobViews ? "any" : linkedInExperience,
    jobType: jobViews ? "any" : linkedInJobType,
    datePosted: jobViews ? "week" : linkedInDatePosted,
    sort: jobViews ? "relevant" : linkedInSort,
    distance: jobViews ? "25" : linkedInDistance,
    easyApply: !jobViews && linkedInEasyApply,
    underTenApplicants: !jobViews && linkedInUnderTen,
  });
  const linkedInPostSearchUrl = linkedInJobPostsSearchUrl({
    monitor: linkedInMonitor,
    query: jobViews ? query : linkedInQuery,
    location:
      jobViews && region === "remote"
        ? "Worldwide"
        : jobViews && region === "sri-lanka"
          ? "Sri Lanka"
          : linkedInLocation,
  });
  const savedCount = jobs.filter((j) => j.status === "saved").length;
  const newCount = jobs.filter(
    (j) => now - new Date(j.firstSeenAt).getTime() < 86400000,
  ).length;
  const liveSources = data.sources.filter((s) => s.enabled);
  const matchedJobs = jobs.filter((j) => j.matchedMonitors.length > 0);
  return (
    <div
      className={`app-shell theme-${theme} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Link
          href="/"
          onClick={(event) => navigate("overview", event)}
          className="brand"
        >
          <span className="brand-icon">
            <Radio size={24} />
          </span>
          jobradar<span className="brand-dot">.</span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={viewPaths[item.id]}
              onClick={(event) => navigate(item.id, event)}
              className={`nav-item ${view === item.id ? "selected" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              data-tooltip={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "saved" && savedCount > 0 && (
                <span className="nav-count">{savedCount}</span>
              )}
              {item.id === "monitors" && (
                <span className="nav-count">{data.monitors.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note" data-tooltip="Create a monitor">
          <div className="note-orbit">
            <Sparkles size={19} />
          </div>
          <strong>A better search starts here.</strong>
          <p>
            Create a monitor. We’ll keep an eye out for your next opportunity.
          </p>
          <button onClick={() => openModal({ type: "monitor" })}>
            Create a monitor <ArrowUpRight size={15} />
          </button>
        </div>
        <Link
          className={`nav-item ${view === "settings" ? "selected" : ""}`}
          href="/settings"
          onClick={(event) => navigate("settings", event)}
          data-tooltip="Workspace settings"
        >
          <Settings2 size={18} />
          <span>Workspace settings</span>
        </Link>
        <button
          className="nav-item"
          onClick={() => openModal({ type: "help" })}
          data-tooltip="Help & getting started"
        >
          <CircleHelp size={18} />
          <span>Help & getting started</span>
          <ArrowUpRight size={14} />
        </button>
        <div className="profile">
          <span className="profile-avatar" data-tooltip="Your workspace">YO</span>
          <span>
            <strong>Your workspace</strong>
            <small>
              {data.mode === "demo"
                ? "Demo explorer"
                : data.authenticated
                  ? "Workspace owner"
                  : "Public viewer"}
            </small>
          </span>
          <button
            className="icon-btn"
            aria-label="Workspace account"
            onClick={() =>
              data.mode === "demo"
                ? navigate("settings")
                : openModal({ type: "login" })
            }
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn sidebar-trigger"
              aria-label={
                mobileNav
                  ? "Close navigation"
                  : sidebarCollapsed
                    ? "Expand sidebar"
                    : "Open navigation"
              }
              onClick={() => {
                if (window.matchMedia("(max-width: 900px)").matches) {
                  setMobileNav((current) => !current);
                } else {
                  setSidebarCollapsed((current) => !current);
                }
              }}
            >
              {mobileNav || !sidebarCollapsed ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeftOpen size={18} />
              )}
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "settings"
                ? "Settings"
                : navigation.find((n) => n.id === view)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="region-label">
              <Globe2 size={14} /> Sri Lanka & remote
            </span>
            <button
              className="icon-btn"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
              onClick={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="icon-btn notification-btn"
              aria-label="View collection activity"
              onClick={() => navigate("activity")}
            >
              <Bell size={19} />
              {data.runs.some((r) => r.status === "failed") && <i />}
            </button>
            <button
              className="top-avatar"
              aria-label="Account settings"
              onClick={(event) => navigate("settings", event)}
            >
              Y
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                {view === "overview"
                  ? "YOUR CAREER, IN FOCUS"
                  : "A MORE THOUGHTFUL JOB SEARCH"}
              </div>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            {view !== "monitors" && view !== "sources" && view !== "activity" && (
              <button
                className="btn primary"
                onClick={() => openModal({ type: "monitor" })}
              >
                <Plus size={17} />
                Create monitor
              </button>
            )}
          </div>
          {data.mode === "demo" && (
            <div className="demo-banner">
              <span>
                <Sparkles size={15} />
                <strong>A look at what’s possible.</strong> You’re exploring
                sample jobs. Changes stay in this browser.
              </span>
              <button onClick={() => navigate("settings")}>
                Connect your workspace <ArrowRight size={14} />
              </button>
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="stats-grid">
                <Stat
                  label="Relevant opportunities"
                  value={matchedJobs.length}
                  icon={<BriefcaseBusiness size={18} />}
                  detail={`${jobs.length} total records collected`}
                  trend={`${newCount} new records today`}
                />
                <Stat
                  label="Matching your interests"
                  value={
                    matchedJobs.length
                  }
                  icon={<Target size={18} />}
                  detail="Matched to your keyword monitors"
                  trend="Made for your search"
                />
                <Stat
                  label="Active monitors"
                  value={activeMonitors.length}
                  icon={<Radio size={18} />}
                  detail={`${liveSources.length} sources on your radar`}
                  trend="Keeping an eye out"
                />
                <Stat
                  label="Saved for later"
                  value={savedCount}
                  icon={<Bookmark size={18} />}
                  detail={`${jobs.filter((j) => j.status === "applied").length} applications recorded`}
                  action={() => navigate("saved")}
                />
              </div>
              <div className="overview-ribbon">
                <div className="ribbon-icon">
                  <Radio size={21} />
                </div>
                <div>
                  <strong>Your next opportunity is out there.</strong>
                  <span>
                    {activeMonitors.length} focused monitors following your CV
                    skills across Sri Lanka and remote roles.
                  </span>
                </div>
                <div className="ribbon-status">
                  <i />
                  {data.mode === "demo"
                    ? "Preview workspace"
                    : "Sources configured"}
                </div>
                <button
                  onClick={() => navigate("monitors")}
                  aria-label="Manage monitors"
                >
                  <ArrowRight size={19} />
                </button>
              </div>
            </>
          )}
          {jobViews && (
            <div
              className={`content-grid ${view !== "overview" ? "wide" : ""}`}
            >
              <section className="opportunities">
                <div className="section-heading">
                  <div>
                    <h2>
                      {view === "saved"
                        ? "Your shortlist"
                        : "Latest opportunities"}
                      <span className="count-pill">{filtered.length}</span>
                    </h2>
                    <p>
                      {view === "saved"
                        ? "Keep track of the roles you want to come back to."
                        : "Collected jobs with source, date, and monitor match context."}
                    </p>
                  </div>
                  <div className="heading-actions">
                    <button
                      className="icon-btn"
                      aria-label="Refresh sources"
                      onClick={sync}
                      disabled={busy}
                    >
                      <RefreshCw size={17} className={busy ? "spin" : ""} />
                    </button>
                    <button className="btn small" onClick={exportJobs}>
                      <ArrowDownToLine size={14} />
                      Export
                    </button>
                  </div>
                </div>
                <div className="jobs-panel">
                  <div className="view-filters" aria-label="Opportunity filters">
                    {(view === "saved"
                      ? [
                          ["all", "Shortlist"],
                          ["applied", "Applied"],
                        ]
                      : [
                          ["matched", "Relevant"],
                          ["all", "All collected"],
                          ["new", "Unreviewed"],
                          ["archived", "Archived"],
                        ]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setTab(key);
                          setPage(1);
                        }}
                        className={tab === key ? "active" : ""}
                      >
                        {key === "matched" && <Sparkles size={13} />} {label}
                        {key === "all" && (
                          <span>
                            {view === "saved"
                              ? savedCount +
                                jobs.filter((j) => j.status === "applied")
                                  .length
                              : jobs.filter((j) => j.status !== "archived")
                                  .length}
                          </span>
                        )}
                        {key === "matched" && (
                          <span>
                            {
                              jobs.filter((j) => j.matchedMonitors.length > 0)
                                .length
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="search-row">
                    <label className="search-box">
                      <Search size={17} />
                      <input
                        ref={searchRef}
                        aria-label="Search jobs"
                        placeholder="Search roles, companies, or keywords…"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setPage(1);
                        }}
                      />
                      {query ? (
                        <button
                          className="icon-btn"
                          aria-label="Clear search"
                          onClick={() => {
                            setQuery("");
                            setPage(1);
                          }}
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <kbd>⌘ K</kbd>
                      )}
                    </label>
                    <button
                      className={`btn filter-btn ${filters ? "chosen" : ""}`}
                      onClick={() => setFilters(!filters)}
                      aria-label="Filters"
                      aria-expanded={filters}
                    >
                      <SlidersHorizontal size={16} />
                      <span>Filters</span>
                      {(region !== "all" ||
                        sourceFilter !== "all" ||
                        monitorFilter !== "all") && <i />}
                    </button>
                    <label className="sort-control">
                      <ArrowDown size={13} />
                      <select
                        aria-label="Sort opportunities"
                        value={sort}
                        onChange={(e) => {
                          setSort(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="newest">Newest first</option>
                        <option value="company">Company name</option>
                      </select>
                    </label>
                  </div>
                  {filters && (
                    <div className="filter-row">
                      <label>
                        Location
                        <select
                          value={region}
                          onChange={(e) => {
                            setRegion(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="all">All locations</option>
                          <option value="sri-lanka">Sri Lanka</option>
                          <option value="remote">Remote</option>
                        </select>
                      </label>
                      <label>
                        Source
                        <select
                          value={sourceFilter}
                          onChange={(e) => {
                            setSourceFilter(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="all">All sources</option>
                          {data.sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Monitor
                        <select
                          value={monitorFilter}
                          onChange={(e) => {
                            setMonitorFilter(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="all">All monitors</option>
                          {data.monitors.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setRegion("all");
                          setSourceFilter("all");
                          setMonitorFilter("all");
                          setQuery("");
                          setPage(1);
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                  <div className="results-row compact-results-row">
                    <span>
                      <strong>{filtered.length}</strong> opportunities{" "}
                      <span className="muted">
                        {query ? `for “${query}”` : "to explore"}
                      </span>
                    </span>
                    <a
                      className="btn small linkedin-search-link"
                      href={linkedInSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Search LinkedIn Jobs for ${query || linkedInMonitor?.name || "software engineering roles"}`}
                    >
                      <LinkedInMark />
                      <span>Search LinkedIn</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                  <div className="job-list">
                    {paginatedJobs.map((job) => (
                      <article key={job.id} className="job-card">
                        <div
                          className={`company-avatar ${companyColor(job.company)}`}
                        >
                          {initials(job.company)}
                        </div>
                        <div className="job-main">
                          <div className="job-title-line">
                            <button
                              className="job-title"
                              onClick={() => openModal({ type: "job", job })}
                            >
                              {job.title}
                            </button>
                            {now - new Date(job.firstSeenAt).getTime() <
                              86400000 && (
                              <span className="status-badge status-new">NEW</span>
                            )}
                          </div>
                          <div className="job-company">
                            {job.company}
                            <span>·</span>
                            {job.employmentType || "Type not specified"}
                          </div>
                          <div className="job-meta">
                            <span>
                              <MapPin size={13} />
                              {job.location}
                            </span>
                            {job.remote && (
                              <span className="remote-label">
                                <Globe2 size={12} />
                                Remote
                              </span>
                            )}
                          </div>
                          <div className="job-tags">
                            {job.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                            {job.matchedMonitors.length > 0 && (
                              <span className="match-tag">
                                <Sparkles size={11} />
                                Monitor match
                              </span>
                            )}
                          </div>
                          <div className="job-bottom">
                            <span className="salary">
                              {job.salary || "Salary not disclosed"}
                            </span>
                            <span className="job-attribution">
                              <span
                                className={`source-dot ${job.sourceId === "s2" ? "orange" : ""}`}
                              />
                              {job.sourceName}
                              <span>·</span>
                              {timeAgo(job.publishedAt || job.firstSeenAt)}
                            </span>
                          </div>
                        </div>
                        <div className="job-side">
                          <button
                            className={`icon-btn bookmark-btn ${job.status === "saved" ? "is-saved" : ""}`}
                            aria-label={
                              job.status === "saved"
                                ? `Unsave ${job.title}`
                                : `Save ${job.title}`
                            }
                            onClick={() =>
                              changeStatus(
                                job,
                                job.status === "saved" ? "new" : "saved",
                              )
                            }
                          >
                            <Bookmark
                              size={18}
                              fill={
                                job.status === "saved" ? "currentColor" : "none"
                              }
                            />
                          </button>
                          {job.status === "applied" && (
                            <span className="status-badge status-applied">
                              <Check size={11} />
                              Applied
                            </span>
                          )}
                          <button
                            className="job-open"
                            aria-label={`View ${job.title}`}
                            onClick={() => openModal({ type: "job", job })}
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <Empty
                      icon={<Search size={25} />}
                      title="Room for a new possibility."
                      description={
                        jobs.length
                          ? "Try another keyword or clear your filters to see more jobs."
                          : "Connect a source and run your first check to start collecting jobs."
                      }
                      action={() => {
                        setQuery("");
                        setRegion("all");
                        setSourceFilter("all");
                        setMonitorFilter("all");
                        setTab("all");
                        setPage(1);
                        if (!jobs.length) navigate("sources");
                      }}
                      label={jobs.length ? "Clear filters" : "Manage sources"}
                    />
                  )}
                  {filtered.length > 0 && (
                    <div className="list-footer pagination-footer">
                      <span>
                        Showing {pageStart}-{pageEnd} of {filtered.length}
                      </span>
                      <div className="pagination-controls" aria-label="Opportunity pagination">
                        <label className="page-size-control">
                          <span>Rows</span>
                          <select
                            aria-label="Rows per page"
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setPage(1);
                            }}
                          >
                            {[8, 12, 20, 40].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="btn small pagination-btn"
                          onClick={() => setPage((value) => Math.max(1, value - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                        <span className="page-indicator">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn small pagination-btn"
                          onClick={() =>
                            setPage((value) => Math.min(totalPages, value + 1))
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="data-note">
                  <ShieldCheck size={13} />
                  Always check availability and location eligibility on the
                  original listing.
                  {data.mode === "live" &&
                    " Showing the latest 1,000 collected records."}
                </div>
              </section>
              {view === "overview" && (
                <aside className="right-rail">
                  <section className="rail-section">
                    <div className="rail-heading">
                      <h3>Your monitors</h3>
                      <button
                        className="icon-btn"
                        aria-label="Add a monitor"
                        onClick={() => openModal({ type: "monitor" })}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="rail-subtitle">
                      Built from the current CV role targets.
                    </p>
                    {data.monitors.slice(0, 4).map((m, i) => (
                      <button
                        key={m.id}
                        className="monitor-preview"
                        onClick={() => {
                          focusMonitor(m.id);
                        }}
                      >
                        <span className={`monitor-icon tone-${i % 3}`}>
                          <Radio size={16} />
                        </span>
                        <span>
                          <strong>{m.name}</strong>
                          <small>
                            {m.keywords.slice(0, 2).join(", ")}
                            {m.keywords.length > 2 ? "…" : ""}
                          </small>
                        </span>
                        <span className="monitor-count">
                          {
                            jobs.filter((j) => j.matchedMonitors.includes(m.id))
                              .length
                          }
                        </span>
                      </button>
                    ))}
                    <button
                      className="rail-link"
                      onClick={() => navigate("monitors")}
                    >
                      Manage monitors <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="rail-section">
                    <div className="rail-heading">
                      <h3>On your radar</h3>
                      <span className="subtle-pill">
                        {liveSources.length} sources
                      </span>
                    </div>
                    <p className="rail-subtitle">
                      Good opportunities start at the source.
                    </p>
                    <div className="source-mini-list">
                      {data.sources.slice(0, 4).map((s) => (
                        <div className="source-mini" key={s.id}>
                          <span className={`source-avatar ${s.kind}`}>
                            {s.kind === "itpro" ? "it" : s.name[0]}
                          </span>
                          <span>
                            <strong>{s.name}</strong>
                            <small>
                              {s.enabled
                                ? s.lastError
                                  ? "Needs attention"
                                  : `Checked ${timeAgo(s.lastSyncedAt)}`
                                : "Paused"}
                            </small>
                          </span>
                          <i
                            className={`status-dot ${!s.enabled ? "paused" : s.lastError ? "failed" : ""}`}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      className="rail-link"
                      onClick={() => navigate("sources")}
                    >
                      View all sources <ArrowRight size={14} />
                    </button>
                  </section>
                  <section className="tip-card">
                    <span className="tip-label">
                      <Sparkles size={14} />CV SIGNAL
                    </span>
                    <h3>Prioritize stack fit.</h3>
                    <p>
                      These monitors include TypeScript, React, Next.js, Node,
                      Laravel, PostgreSQL, Docker, AWS, and API work.
                    </p>
                    <button onClick={() => openModal({ type: "monitor" })}>
                      Fine-tune monitors <ArrowUpRight size={15} />
                    </button>
                    <div className="tip-decoration">
                      <Target size={75} strokeWidth={0.7} />
                    </div>
                  </section>
                  <p className="rail-footnote">
                    Compact tracking for Sri Lanka and remote jobs.
                    <br />
                    Original listing data stays attached.
                  </p>
                </aside>
              )}
            </div>
          )}
          {view === "monitors" && (
            <section className="operations-panel">
              <div className="section-heading">
                <div>
                  <h2>
                    Your monitors{" "}
                    <span className="count-pill">{filteredMonitors.length}</span>
                  </h2>
                  <p>
                    Search, filter, edit, and review matching jobs for every
                    CV-aligned monitor.
                  </p>
                </div>
              </div>
              <div className="jobs-panel admin-table-panel">
                <div className="view-filters" aria-label="Monitor filters">
                  {[
                    ["all", "All monitors", data.monitors.length],
                    ["enabled", "Active", data.monitors.filter((m) => m.enabled).length],
                    ["paused", "Paused", data.monitors.filter((m) => !m.enabled).length],
                  ].map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setWorkspaceFilter(String(key));
                        setPage(1);
                      }}
                      className={workspaceFilter === key ? "active" : ""}
                    >
                      {label}<span>{count}</span>
                    </button>
                  ))}
                </div>
                <div className="search-row">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search monitors"
                      placeholder="Search monitor names, keywords, exclusions, or locations…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                    {query ? (
                      <button
                        className="icon-btn"
                        aria-label="Clear monitor search"
                        onClick={() => {
                          setQuery("");
                          setPage(1);
                        }}
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <kbd>⌘ K</kbd>
                    )}
                  </label>
                  <button className="btn filter-btn" onClick={() => openModal({ type: "monitor" })}>
                    <Plus size={16} />
                    <span>Create monitor</span>
                  </button>
                </div>
                <div className="results-row">
                  <span>
                    <strong>{filteredMonitors.length}</strong> monitors{" "}
                    <span className="muted">ready to review</span>
                  </span>
                  <span className="muted">Rows update with your search</span>
                </div>
                {filteredMonitors.length ? (
                  <div className="activity-table admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Monitor</th>
                          <th>Keywords</th>
                          <th>Scope</th>
                          <th>Matches</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedMonitors.map((m, i) => {
                          const matchCount = jobs.filter((j) => j.matchedMonitors.includes(m.id)).length;
                          return (
                            <tr key={m.id}>
                              <td>
                                <span className="table-title-cell">
                                  <span className={`monitor-icon tone-${i % 3}`}>
                                    <Radio size={15} />
                                  </span>
                                  <span>
                                    <strong>{m.name}</strong>
                                    {m.excludedKeywords.length > 0 && (
                                      <small>Excluding {m.excludedKeywords.slice(0, 3).join(", ")}</small>
                                    )}
                                  </span>
                                </span>
                              </td>
                              <td>
                                <div className="keyword-chips compact">
                                  {m.keywords.slice(0, 4).map((k) => (
                                    <span key={k}>{k}</span>
                                  ))}
                                  {m.keywords.length > 4 && (
                                    <span className="chip-more">+{m.keywords.length - 4}</span>
                                  )}
                                </div>
                              </td>
                              <td>{m.remoteOnly ? "Remote only" : m.location || "Any location"}</td>
                              <td>
                                <button className="text-btn" onClick={() => focusMonitor(m.id)}>
                                  {matchCount} jobs <ArrowRight size={13} />
                                </button>
                              </td>
                              <td>
                                <button
                                  className={`toggle ${m.enabled ? "on" : ""}`}
                                  role="switch"
                                  aria-checked={m.enabled}
                                  aria-label={`Enable ${m.name}`}
                                  onClick={() =>
                                    action("monitor-save", m.id, {
                                      ...m,
                                      enabled: !m.enabled,
                                    }).catch((e) => setToast(e.message))
                                  }
                                >
                                  <span />
                                </button>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <a
                                    className="btn small linkedin-monitor-link"
                                    href={linkedInJobsSearchUrl({ monitor: m })}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Search LinkedIn Jobs for ${m.name}`}
                                  >
                                    <LinkedInMark />
                                    LinkedIn
                                  </a>
                                  <button
                                    className="btn small"
                                    onClick={() => openModal({ type: "monitor", monitor: m })}
                                  >
                                    <Settings2 size={14} />
                                    Edit
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={<Radio size={25} />}
                    title="No monitors match that view."
                    description="Clear the search or create a new keyword monitor."
                    action={() => {
                      setQuery("");
                      setWorkspaceFilter("all");
                      setPage(1);
                    }}
                    label="Clear filters"
                  />
                )}
                {filteredMonitors.length > 0 && (
                  <div className="list-footer pagination-footer">
                    <span>
                      Showing {(monitorPage - 1) * pageSize + 1}-{Math.min(monitorPage * pageSize, filteredMonitors.length)} of {filteredMonitors.length}
                    </span>
                    <div className="pagination-controls" aria-label="Monitor pagination">
                      <label className="page-size-control">
                        <span>Rows</span>
                        <select
                          aria-label="Monitor rows per page"
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                        >
                          {[8, 12, 20, 40].map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={monitorPage === 1}>Previous</button>
                      <span className="page-indicator">Page {monitorPage} of {Math.max(1, Math.ceil(filteredMonitors.length / pageSize))}</span>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.min(Math.max(1, Math.ceil(filteredMonitors.length / pageSize)), value + 1))} disabled={monitorPage === Math.max(1, Math.ceil(filteredMonitors.length / pageSize))}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {view === "sources" && (
            <section className="operations-panel">
              <div className="sources-intro">
                <ShieldCheck size={20} />
                <p>
                  Sources use public APIs and feeds. Every opportunity links
                  back to its original publisher. Collection respects each
                  source’s check interval.
                </p>
              </div>
              <div className="linkedin-discovery-panel">
                <span className="linkedin-discovery-icon" aria-hidden="true">
                  <LinkedInMark />
                </span>
                <div className="linkedin-discovery-copy">
                  <strong>LinkedIn Jobs discovery</strong>
                  <p>
                    Start with a monitor, then refine the position, location,
                    work arrangement, experience, job type, and posting date.
                  </p>
                </div>
                <div className="linkedin-search-fields">
                  <label className="linkedin-filter-field linkedin-monitor-select">
                    <span>Monitor</span>
                    <select
                      aria-label="Monitor for LinkedIn Jobs search"
                      value={linkedInMonitor?.id || ""}
                      onChange={(event) => setMonitorFilter(event.target.value)}
                      disabled={!data.monitors.length}
                    >
                      {data.monitors.map((monitor) => (
                        <option key={monitor.id} value={monitor.id}>
                          {monitor.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="linkedin-filter-field linkedin-query-field">
                    <span>Position or keywords</span>
                    <div>
                      <Search size={15} />
                      <input
                        aria-label="LinkedIn position or keywords"
                        placeholder={linkedInMonitor?.name || "Software engineer"}
                        value={linkedInQuery}
                        onChange={(event) => setLinkedInQuery(event.target.value)}
                      />
                    </div>
                  </label>
                  <label className="linkedin-filter-field linkedin-location-field">
                    <span>Location</span>
                    <div>
                      <MapPin size={15} />
                      <input
                        aria-label="LinkedIn job location"
                        placeholder={linkedInMonitor?.location || "Sri Lanka"}
                        value={linkedInLocation}
                        onChange={(event) => setLinkedInLocation(event.target.value)}
                      />
                    </div>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Work arrangement</span>
                    <select
                      aria-label="LinkedIn work arrangement"
                      value={linkedInWorkplace}
                      onChange={(event) =>
                        setLinkedInWorkplace(event.target.value as LinkedInWorkplace)
                      }
                    >
                      <option value="any">Any arrangement</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                    </select>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Experience</span>
                    <select
                      aria-label="LinkedIn experience level"
                      value={linkedInExperience}
                      onChange={(event) =>
                        setLinkedInExperience(event.target.value as LinkedInExperience)
                      }
                    >
                      <option value="any">Any level</option>
                      <option value="internship">Internship</option>
                      <option value="entry">Entry level</option>
                      <option value="associate">Associate</option>
                      <option value="mid-senior">Mid-Senior level</option>
                      <option value="director">Director</option>
                      <option value="executive">Executive</option>
                    </select>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Job type</span>
                    <select
                      aria-label="LinkedIn job type"
                      value={linkedInJobType}
                      onChange={(event) =>
                        setLinkedInJobType(event.target.value as LinkedInJobType)
                      }
                    >
                      <option value="any">Any job type</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                      <option value="internship">Internship</option>
                    </select>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Date posted</span>
                    <select
                      aria-label="LinkedIn date posted"
                      value={linkedInDatePosted}
                      onChange={(event) =>
                        setLinkedInDatePosted(event.target.value as LinkedInDatePosted)
                      }
                    >
                      <option value="any">Any time</option>
                      <option value="day">Past 24 hours</option>
                      <option value="week">Past week</option>
                      <option value="month">Past month</option>
                    </select>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Sort results</span>
                    <select
                      aria-label="LinkedIn result order"
                      value={linkedInSort}
                      onChange={(event) =>
                        setLinkedInSort(event.target.value as LinkedInSort)
                      }
                    >
                      <option value="relevant">Most relevant</option>
                      <option value="recent">Most recent</option>
                    </select>
                  </label>
                  <label className="linkedin-filter-field">
                    <span>Search radius</span>
                    <select
                      aria-label="LinkedIn location radius"
                      value={linkedInDistance}
                      onChange={(event) =>
                        setLinkedInDistance(event.target.value as LinkedInDistance)
                      }
                    >
                      <option value="0">Exact location</option>
                      <option value="10">Within 10 km</option>
                      <option value="25">Within 25 km</option>
                      <option value="50">Within 50 km</option>
                      <option value="100">Within 100 km</option>
                    </select>
                  </label>
                  <fieldset className="linkedin-quick-filters">
                    <legend>Application filters</legend>
                    <label>
                      <input
                        type="checkbox"
                        checked={linkedInEasyApply}
                        onChange={(event) =>
                          setLinkedInEasyApply(event.target.checked)
                        }
                      />
                      <span>Easy Apply</span>
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={linkedInUnderTen}
                        onChange={(event) =>
                          setLinkedInUnderTen(event.target.checked)
                        }
                      />
                      <span>Under 10 applicants</span>
                    </label>
                  </fieldset>
                  <a
                    className="btn linkedin-search-link linkedin-discovery-submit"
                    href={linkedInSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Search LinkedIn Jobs for ${linkedInQuery || linkedInMonitor?.name || "software engineering roles"}`}
                  >
                    <LinkedInMark />
                    Search LinkedIn
                    <ExternalLink size={13} />
                  </a>
                  <div className="linkedin-search-paths" aria-label="LinkedIn discovery searches">
                    <a
                      className="linkedin-path-link"
                      href={linkedInNetworkSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span><Globe2 size={15} /> Jobs in my network</span>
                      <ExternalLink size={13} />
                    </a>
                    <a
                      className="linkedin-path-link"
                      href={linkedInPostSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span><Activity size={15} /> Job-related posts</span>
                      <ExternalLink size={13} />
                    </a>
                    <p>
                      LinkedIn ranks these searches using your signed-in network.
                      Reactions by connections are not available as a search filter.
                    </p>
                  </div>
                </div>
              </div>
              <div className="jobs-panel admin-table-panel">
                <div className="view-filters" aria-label="Source filters">
                  {[
                    ["all", "All sources", data.sources.length],
                    ["connected", "Connected", data.sources.filter((s) => s.enabled && !s.lastError).length],
                    ["paused", "Paused", data.sources.filter((s) => !s.enabled).length],
                    ["error", "Needs attention", data.sources.filter((s) => s.lastError).length],
                  ].map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setWorkspaceFilter(String(key));
                        setPage(1);
                      }}
                      className={workspaceFilter === key ? "active" : ""}
                    >
                      {label}<span>{count}</span>
                    </button>
                  ))}
                </div>
                <div className="search-row">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search sources"
                      placeholder="Search source names, platforms, or boards…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                    {query ? (
                      <button className="icon-btn" aria-label="Clear source search" onClick={() => { setQuery(""); setPage(1); }}>
                        <X size={14} />
                      </button>
                    ) : (
                      <kbd>⌘ K</kbd>
                    )}
                  </label>
                  <div className="toolbar-actions source-toolbar-actions">
                    <button className="btn filter-btn" onClick={sync} disabled={busy}>
                      <RefreshCw size={15} className={busy ? "spin" : ""} />
                      <span>Check sources</span>
                    </button>
                    <button className="btn filter-btn" onClick={() => openModal({ type: "source" })}>
                      <Plus size={16} />
                      <span>Connect source</span>
                    </button>
                  </div>
                </div>
                <div className="results-row">
                  <span><strong>{filteredSources.length}</strong> sources <span className="muted">in this view</span></span>
                  <span className="muted">{liveSources.length} currently enabled</span>
                </div>
                {filteredSources.length ? (
                  <div className="activity-table admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Platform</th>
                          <th>Collected</th>
                          <th>Frequency</th>
                          <th>Last check</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSources.map((source) => (
                          <tr key={source.id}>
                            <td>
                              <span className="table-title-cell">
                                <span className={`source-avatar ${source.kind}`}>{source.kind === "itpro" ? "it" : source.name[0]}</span>
                                <span>
                                  <strong>{source.name}</strong>
                                  {source.board && <small>{source.board}</small>}
                                </span>
                              </span>
                            </td>
                            <td>{kindNames[source.kind]}</td>
                            <td>{source.jobCount}</td>
                            <td>Every {source.intervalMinutes / 60}h</td>
                            <td>{timeAgo(source.lastSyncedAt)}</td>
                            <td>
                              <button
                                className={`source-state table-state ${!source.enabled ? "is-paused" : source.lastError ? "is-failed" : "is-connected"}`}
                                onClick={() => action("source-toggle", source.id, !source.enabled).catch((e) => setToast(e.message))}
                              >
                                <i className={`status-dot ${source.lastError ? "failed" : !source.enabled ? "paused" : ""}`} />
                                {!source.enabled ? "Paused" : source.lastError ? "Needs attention" : "Connected"}
                              </button>
                              {source.lastError && <small className="inline-error">{source.lastError}</small>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={<Link2 size={25} />}
                    title="No sources match that view."
                    description="Clear the search or connect a new Sri Lanka or remote job source."
                    action={() => { setQuery(""); setWorkspaceFilter("all"); setPage(1); }}
                    label="Clear filters"
                  />
                )}
                {filteredSources.length > 0 && (
                  <div className="list-footer pagination-footer">
                    <span>Showing {(sourcePage - 1) * pageSize + 1}-{Math.min(sourcePage * pageSize, filteredSources.length)} of {filteredSources.length}</span>
                    <div className="pagination-controls" aria-label="Source pagination">
                      <label className="page-size-control"><span>Rows</span><select aria-label="Source rows per page" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[8, 12, 20, 40].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={sourcePage === 1}>Previous</button>
                      <span className="page-indicator">Page {sourcePage} of {Math.max(1, Math.ceil(filteredSources.length / pageSize))}</span>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.min(Math.max(1, Math.ceil(filteredSources.length / pageSize)), value + 1))} disabled={sourcePage === Math.max(1, Math.ceil(filteredSources.length / pageSize))}>Next</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="info-panel compact-info">
                <h3>A note about coverage</h3>
                <p>
                  Sri Lankan tech sources and remote sources stay connected as
                  separate feeds, with original publisher links preserved for
                  every collected job.
                </p>
              </div>
            </section>
          )}
          {view === "activity" && (
            <section className="operations-panel">
              <div className="jobs-panel admin-table-panel">
                <div className="view-filters" aria-label="Activity filters">
                  {[
                    ["all", "All checks", data.runs.length],
                    ["success", "Success", data.runs.filter((r) => r.status === "success").length],
                    ["failed", "Failed", data.runs.filter((r) => r.status === "failed").length],
                    ["running", "Running", data.runs.filter((r) => r.status === "running").length],
                  ].map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setWorkspaceFilter(String(key));
                        setPage(1);
                      }}
                      className={workspaceFilter === key ? "active" : ""}
                    >
                      {label}<span>{count}</span>
                    </button>
                  ))}
                </div>
                <div className="search-row">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      aria-label="Search activity"
                      placeholder="Search source names, statuses, or errors…"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                    />
                    {query ? (
                      <button className="icon-btn" aria-label="Clear activity search" onClick={() => { setQuery(""); setPage(1); }}>
                        <X size={14} />
                      </button>
                    ) : (
                      <kbd>⌘ K</kbd>
                    )}
                  </label>
                  <button className="btn filter-btn" onClick={sync} disabled={busy}>
                    <RefreshCw size={15} className={busy ? "spin" : ""} />
                    <span>Check sources</span>
                  </button>
                </div>
                <div className="results-row">
                  <span><strong>{filteredRuns.length}</strong> source checks <span className="muted">in this view</span></span>
                  <span className="muted">Latest collection history</span>
                </div>
                {filteredRuns.length ? (
                  <div className="activity-table admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Started</th>
                          <th>Status</th>
                          <th>Collected</th>
                          <th>New jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRuns.map((run) => (
                          <tr key={run.id}>
                            <td>
                              <strong>{run.sourceName}</strong>
                              {run.error && <small className="inline-error">{run.error}</small>}
                            </td>
                            <td>{dateTime(run.startedAt)}</td>
                            <td>
                              <span className={`run-status ${run.status}`}>
                                {run.status === "success" ? <Check size={12} /> : run.status === "failed" ? <X size={12} /> : <Activity size={12} />} {run.status}
                              </span>
                            </td>
                            <td>{run.fetched}</td>
                            <td>+{run.added}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={<Activity size={25} />}
                    title="No source checks match that view."
                    description="Clear the search or run a fresh source check."
                    action={() => { setQuery(""); setWorkspaceFilter("all"); setPage(1); }}
                    label="Clear filters"
                  />
                )}
                {filteredRuns.length > 0 && (
                  <div className="list-footer pagination-footer">
                    <span>Showing {(runPage - 1) * pageSize + 1}-{Math.min(runPage * pageSize, filteredRuns.length)} of {filteredRuns.length}</span>
                    <div className="pagination-controls" aria-label="Activity pagination">
                      <label className="page-size-control"><span>Rows</span><select aria-label="Activity rows per page" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[8, 12, 20, 40].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={runPage === 1}>Previous</button>
                      <span className="page-indicator">Page {runPage} of {Math.max(1, Math.ceil(filteredRuns.length / pageSize))}</span>
                      <button className="btn small pagination-btn" onClick={() => setPage((value) => Math.min(Math.max(1, Math.ceil(filteredRuns.length / pageSize)), value + 1))} disabled={runPage === Math.max(1, Math.ceil(filteredRuns.length / pageSize))}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
          {view === "settings" && (
            <div className="settings-grid">
              <section className="settings-card">
                <span className="settings-icon">
                  <Database size={22} />
                </span>
                <h2>
                  {data.mode === "demo"
                    ? "Turn your preview into a workspace."
                    : "Your workspace is connected."}
                </h2>
                <p>
                  {data.mode === "demo"
                    ? "Connect PostgreSQL to store real opportunities, keep your monitors, and collect new jobs automatically."
                    : "Your jobs, monitors, and source history are stored in PostgreSQL."}
                </p>
                <div className="setting-row">
                  <span>Workspace mode</span>
                  <strong>
                    {data.mode === "demo"
                      ? "Interactive demo"
                      : "Live collection"}
                  </strong>
                </div>
                <div className="setting-row">
                  <span>Primary focus</span>
                  <strong>Sri Lanka & remote</strong>
                </div>
                <div className="setting-row">
                  <span>Access</span>
                  <strong>
                    {data.authenticated
                      ? "Owner"
                      : data.mode === "demo"
                        ? "Demo explorer"
                        : "Public viewer"}
                  </strong>
                </div>
                {data.mode === "live" && (
                  <button
                    className="btn primary"
                    onClick={async () => {
                      if (data.authenticated) {
                        const r = await fetch("/api/auth", {
                          method: "DELETE",
                        });
                        if (r.ok) {
                          await refresh();
                          setToast("Signed out.");
                        }
                      } else openModal({ type: "login" });
                    }}
                  >
                    {data.authenticated ? "Sign out" : "Sign in as owner"}
                    <ArrowRight size={15} />
                  </button>
                )}
              </section>
              <section className="settings-card">
                <h3>
                  {data.mode === "demo"
                    ? "Three steps to your next chapter"
                    : "Reliable by design"}
                </h3>
                <ol className="setup-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Connect a database</strong>
                      <p>
                        Follow the included README to use local PostgreSQL or a
                        managed provider.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Set your workspace password</strong>
                      <p>
                        Owner access protects your monitors, saved jobs, and
                        collection controls.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Start the collector</strong>
                      <p>
                        Run the included worker or configure the protected
                        scheduled endpoint.
                      </p>
                    </div>
                  </li>
                </ol>
                <p className="settings-hint">
                  <ShieldCheck size={16} />
                  Source listings are publicly readable. This first release has
                  one shared owner workspace.
                </p>
              </section>
              <section className="info-panel">
                <h3>Your data, clearly labeled.</h3>
                <p>
                  Publication dates come from the original source when
                  available. Discovery dates show when Jobradar first collected
                  a listing. “Remote” does not guarantee eligibility from Sri
                  Lanka; always check location requirements.
                </p>
                {data.mode === "demo" && (
                  <button
                    className="btn"
                    onClick={() => {
                      localStorage.removeItem("jobradar-demo-v2");
                      refresh().catch((e) => setToast(e.message));
                      setToast("Demo workspace reset.");
                    }}
                  >
                    Reset demo changes
                  </button>
                )}
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              jobradar <span className="brand-dot">·</span> Less searching. More
              possibility.
            </span>
            <span>
              <span className="tiny-dot" />
              {data.mode === "demo"
                ? "Sample data preview"
                : "PostgreSQL connected"}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={17} />
          </span>
          <p>{toast}</p>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {refreshing && <div className="refresh-skeleton" aria-hidden="true" />}
      {modal && (
        <ModalDialog
          title={
            modal.type === "monitor"
              ? modal.monitor
                ? "Fine-tune your monitor"
                : "A new direction to explore"
              : modal.type === "source"
                ? "Connect a new source"
                : modal.type === "job"
                  ? "Opportunity details"
                  : modal.type === "login"
                    ? "Welcome to your workspace"
                    : "A calmer way to find what’s next"
          }
          close={() => closeModal()}
        >
          {modal.type === "monitor" && (
            <MonitorForm
              monitor={modal.monitor}
              onSave={async (value) => {
                await action("monitor-save", modal.monitor?.id, value);
                closeModal();
                setToast("Monitor saved. Matching jobs are ready to explore.");
              }}
              onDelete={
                modal.monitor
                  ? async () => {
                      await action("monitor-delete", modal.monitor!.id);
                      closeModal();
                      setToast(
                        "Monitor deleted. Your collected jobs are still here.",
                      );
                    }
                  : undefined
              }
            />
          )}
          {modal.type === "source" && (
            <SourceForm
              onSave={async (value) => {
                await action("source-add", undefined, value);
                closeModal();
                setToast(
                  data.mode === "demo"
                    ? "Source added to the demo. Connect your database to collect real jobs."
                    : "Source connected. It will be checked on the next collection.",
                );
              }}
            />
          )}
          {modal.type === "job" && (
            <JobDetail
              job={jobs.find((j) => j.id === modal.job.id) || modal.job}
              demo={data.mode === "demo"}
              onStatus={changeStatus}
            />
          )}
          {modal.type === "login" && (
            <LoginForm
              onSave={async (password) => {
                const response = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                await refresh();
                closeModal();
                setToast("You’re signed in. Welcome back.");
              }}
            />
          )}
          {modal.type === "help" && (
            <div className="help-content">
              <p>
                Jobradar brings Sri Lankan and remote tech opportunities into
                one workspace.
              </p>
              <ol className="setup-steps">
                <li>
                  <span>1</span>
                  <div>
                    <strong>Connect your sources</strong>
                    <p>
                      Start with ITPro.lk and Remotive, then add individual
                      employer boards.
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Follow what matters</strong>
                    <p>
                      Create a monitor with role names or skills. Any included
                      keyword can match; exclusions narrow the results.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>Make your next move</strong>
                    <p>
                      Save a role, open the original listing, and record your
                      application.
                    </p>
                  </div>
                </li>
              </ol>
              <p className="muted">
                The demo uses illustrative listings. Live collection starts
                after your database and worker are configured.
              </p>
              <button
                className="btn primary"
                onClick={() => {
                  closeModal(true);
                  navigate("settings");
                }}
              >
                Open workspace settings <ArrowRight size={15} />
              </button>
            </div>
          )}
        </ModalDialog>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  detail,
  trend,
  action,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
  trend?: string;
  action?: () => void;
}) {
  return (
    <section className="stat-card">
      <div className="stat-heading">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value.toLocaleString()}
        <span>
          {trend ? (
            <>
              <ArrowUpRight size={12} />
              {trend}
            </>
          ) : (
            <button onClick={action}>
              View shortlist <ArrowRight size={12} />
            </button>
          )}
        </span>
      </div>
      <p>{detail}</p>
    </section>
  );
}
function Empty({
  icon,
  title,
  description,
  action,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn" onClick={action}>
        {label}
      </button>
    </div>
  );
}

function ModalDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    const element = ref.current;
    element?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = element?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === element)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal"
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow">YOUR JOBRADAR</span>
            <h2 id="dialog-title">{title}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function MonitorForm({
  monitor,
  onSave,
  onDelete,
}: {
  monitor?: Monitor;
  onSave: (value: Omit<Monitor, "id" | "createdAt">) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(monitor?.name || "");
  const [keywords, setKeywords] = useState(monitor?.keywords.join(", ") || "");
  const [excluded, setExcluded] = useState(
    monitor?.excludedKeywords.join(", ") || "",
  );
  const [location, setLocation] = useState(monitor?.location || "");
  const [remote, setRemote] = useState(monitor?.remoteOnly || false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const split = (v: string) =>
    Array.from(
      new Set(
        v
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      ),
    );
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const value = monitorSchema.parse({
            name,
            keywords: split(keywords),
            excludedKeywords: split(excluded),
            location,
            remoteOnly: remote,
            enabled: monitor?.enabled ?? true,
          });
          await onSave(value);
        } catch (e) {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "Give your monitor a name and at least one keyword (maximum 20)."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Tell us what a good fit looks like. We’ll gather matching opportunities
        as your sources update.
      </p>
      <label>
        Monitor name
        <input
          required
          maxLength={80}
          placeholder="e.g. My next frontend role"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Keywords <span>Separate with commas</span>
        <input
          required
          placeholder="React, TypeScript, frontend"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <small>
          A job matches if any keyword appears in its title, company, tags, or
          description.
        </small>
      </label>
      <label>
        Exclude keywords <span>Optional</span>
        <input
          placeholder="Senior, lead, manager"
          value={excluded}
          onChange={(e) => setExcluded(e.target.value)}
        />
      </label>
      <label>
        Location <span>Optional</span>
        <input
          placeholder="Sri Lanka, Colombo, or leave blank for anywhere"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <small>
          Use one location phrase. Remote roles can still have country
          restrictions.
        </small>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={remote}
          onChange={(e) => setRemote(e.target.checked)}
        />
        Remote roles only
      </label>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        {onDelete && (
          <button
            type="button"
            className="text-btn danger"
            disabled={busy}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              setBusy(true);
              try {
                await onDelete();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 size={14} />
            {confirmDelete ? "Confirm deletion" : "Delete monitor"}
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Radio size={16} />
          )}{" "}
          {monitor ? "Save changes" : "Create monitor"}
        </button>
      </div>
    </form>
  );
}
function SourceForm({
  onSave,
}: {
  onSave: (value: {
    name: string;
    kind: SourceKind;
    board: string;
  }) => Promise<void>;
}) {
  const [kind, setKind] = useState<SourceKind>("itpro");
  const [name, setName] = useState("ITPro.lk");
  const [board, setBoard] = useState("software-engineering");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(
            sourceSchema.parse({
              name,
              kind,
              board,
            }),
          );
        } catch (e) {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "Enter a name and a valid employer board identifier."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Connect a public feed or an employer’s career board. We’ll preserve the
        original source of every opportunity.
      </p>
      <label>
        Source type
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as SourceKind;
            setKind(k);
            setName(kindNames[k]);
            setBoard(
              k === "topjobs"
                ? "SDQ"
                : k === "xpressjobs"
                  ? "it"
                : k === "jobeka"
                  ? "IT-Software-and-Design"
                  : k === "devjobs"
                    ? "fullstack-jobs"
                  : k === "itpro"
                    ? "software-engineering"
                    : "",
            );
          }}
        >
          {Object.entries(kindNames).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Display name
        <input
          required
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {["itpro", "topjobs", "xpressjobs", "jobeka", "devjobs", "greenhouse", "lever"].includes(
        kind,
      ) && (
        <label>
          {["greenhouse", "lever"].includes(kind)
            ? "Employer board identifier"
            : "Source category"}
          <input
            required
            placeholder={
              kind === "greenhouse"
                ? "e.g. acme"
                : kind === "lever"
                  ? "e.g. dijital-team-pty-ltd"
                  : kind === "topjobs"
                    ? "SDQ"
                    : kind === "xpressjobs"
                      ? "it"
                      : kind === "jobeka"
                        ? "IT-Software-and-Design"
                        : kind === "devjobs"
                          ? "fullstack-jobs"
                          : "software-engineering"
            }
            pattern="[a-zA-Z0-9_-]+"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
          />
          <small>
            {["greenhouse", "lever"].includes(kind)
              ? `The employer name in its ${kindNames[kind]} board URL. Enter the identifier, not the full URL.`
              : kind === "xpressjobs"
                ? "Use it for the XpressJobs IT sector path."
                : kind === "devjobs"
                  ? "Use fullstack-jobs, react-jobs, frontend-jobs, php-jobs, or another DevJobs category slug."
                  : "Use the default category identifier for this public Sri Lankan job source."}
          </small>
        </label>
      )}
      <div className="source-form-note">
        <Clock3 size={18} />
        <p>
          {kind === "remotive"
            ? "Checks every 6 hours. Remotive’s public listings are delayed by 24 hours and always link back to Remotive."
            : kind === "itpro"
              ? "Checks every hour. Use software-engineering for focused Sri Lankan software roles, or leave blank for the broad RSS feed."
              : kind === "topjobs"
                ? "Checks every hour. Uses TopJobs’ Software Development / QA category page."
                : kind === "xpressjobs"
                  ? "Checks every hour. Uses XpressJobs’ public IT sector page."
                  : kind === "jobeka"
                    ? "Checks every 6 hours. Uses JobEka’s IT Software & Design category page."
                    : kind === "rooster"
                      ? "Checks every hour. Tracks Rooster’s public jobs landing page for Sri Lankan openings."
                      : kind === "neojobs"
                        ? "Checks every hour. Tracks Neo Jobs for Sri Lankan tech and remote listings."
                        : kind === "jobster"
                          ? "Checks every 6 hours. Tracks Jobster’s public AI job-search portal."
                          : kind === "devjobs"
                            ? "Checks every hour. Imports DevJobs cards from the selected tech category."
              : kind === "arbeitnow"
                ? "Checks every 6 hours. Collects the latest page of European jobs; use an employer board for full employer coverage."
                : "Checks every hour. Connects this specific employer’s publicly listed jobs."}
        </p>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Link2 size={16} />
          )}
          Connect source
        </button>
      </div>
    </form>
  );
}
function JobDetail({
  job,
  demo,
  onStatus,
}: {
  job: Job;
  demo: boolean;
  onStatus: (job: Job, status: JobStatus) => Promise<void>;
}) {
  return (
    <div className="job-detail">
      <div className="detail-title">
        <span className={`company-avatar ${companyColor(job.company)}`}>
          {initials(job.company)}
        </span>
        <div>
          <h2>{job.title}</h2>
          <p>{job.company}</p>
        </div>
      </div>
      <div className="detail-meta">
        <span>
          <MapPin size={15} />
          {job.location}
        </span>
        <span>
          <BriefcaseBusiness size={15} />
          {job.employmentType || "Type not specified"}
        </span>
        {job.remote && (
          <span>
            <Globe2 size={15} />
            Remote
          </span>
        )}
      </div>
      <span className={`status-badge status-${job.status} detail-status`}>
        {job.status === "applied" && <Check size={12} />}
        {job.status === "saved" && <Bookmark size={12} />}
        {job.status === "archived" && <Trash2 size={12} />}
        {job.status === "new" ? "New" : job.status}
      </span>
      {demo && (
        <div className="demo-notice">
          Illustrative sample — this is not a verified job opening.
        </div>
      )}
      <div className="detail-actions">
        {!demo && (
          <a
            className="btn primary"
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on {job.sourceName}
            <ExternalLink size={15} />
          </a>
        )}
        <button
          className="btn"
          onClick={() =>
            onStatus(job, job.status === "saved" ? "new" : "saved")
          }
        >
          <Bookmark size={15} />
          {job.status === "saved" ? "Saved" : "Save job"}
        </button>
        <button
          className="btn"
          onClick={() =>
            onStatus(job, job.status === "applied" ? "new" : "applied")
          }
        >
          <Check size={15} />
          {job.status === "applied" ? "Applied" : "Mark applied"}
        </button>
      </div>
      <div className="detail-description">
        <h3>About the opportunity</h3>
        <p>
          {job.description ||
            "Read the full description on the original listing."}
        </p>
      </div>
      <dl className="detail-dates">
        <div>
          <dt>Original source</dt>
          <dd>{job.sourceName}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{dateTime(job.publishedAt)}</dd>
        </div>
        <div>
          <dt>First discovered</dt>
          <dd>{dateTime(job.firstSeenAt)}</dd>
        </div>
        <div>
          <dt>Last seen in source</dt>
          <dd>{dateTime(job.lastSeenAt)}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>{job.salary || "Not disclosed"}</dd>
        </div>
      </dl>
      <p className="muted">
        Confirm availability and country eligibility on the source website
        before applying.
      </p>
      <button
        className="text-btn"
        onClick={() =>
          onStatus(job, job.status === "archived" ? "new" : "archived")
        }
      >
        {job.status === "archived"
          ? "Restore opportunity"
          : "Archive this opportunity"}
      </button>
    </div>
  );
}
function LoginForm({
  onSave,
}: {
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(password);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Sign in as the owner to manage sources, edit monitors, and update your
        shortlist.
      </p>
      <label>
        Workspace password
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          Sign in
        </button>
      </div>
    </form>
  );
}

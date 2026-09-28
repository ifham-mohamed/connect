"use client";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { WorkspaceContentSkeleton } from "@/components/workspace-content-skeleton";
import type { CvProfile } from "@/lib/cv/profile";
import { cvSkillTerms } from "@/lib/cv/profile";
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
import { containsKeyword, matchesMonitor, plainText } from "@/lib/matching";
import type {
  DashboardData,
  Job,
  JobStatus,
  Monitor,
  SourceKind,
} from "@/lib/types";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe2,
  LogOut,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Settings2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityView } from "./dashboard/activity-view";
import { JobDetail } from "./dashboard/job-detail";
import { JobsView } from "./dashboard/jobs-view";
import { ModalDialog } from "./dashboard/modal-dialog";
import { MonitorForm } from "./dashboard/monitor-form";
import { MonitorsView } from "./dashboard/monitors-view";
import { OverviewView } from "./dashboard/overview-view";
import { SettingsView } from "./dashboard/settings-view";
import {
  accountInitials,
  CvWorkspace,
  dateTime,
  IntelligenceControls,
  kindNames,
  Modal,
  navigation,
  pathViews,
  Revisions,
  Theme,
  titles,
  View,
  viewPaths,
} from "./dashboard/shared";
import { SourceForm } from "./dashboard/source-form";
import { SourcesView } from "./dashboard/sources-view";
export default function Dashboard({
  initialView = "overview",
  initialData = null,
  initialRevisions = {},
  initialNextCursor = null,
  initialJobsTotal = 0,
  deferredResources = [],
}: {
  initialView?: View;
  initialData?: DashboardData | null;
  initialRevisions?: Revisions;
  initialNextCursor?: string | null;
  initialJobsTotal?: number;
  deferredResources?: Array<"jobs" | "monitors" | "sources" | "runs">;
}) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(initialData);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [view, setView] = useState<View>(initialView);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [monitorFilter, setMonitorFilter] = useState("all");
  const [tab, setTab] = useState(
    initialView === "jobs" || initialView === "overview" ? "matched" : "all",
  );
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [jobsNextCursor, setJobsNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [jobsTotal, setJobsTotal] = useState(initialJobsTotal);
  const [resourceLoading, setResourceLoading] = useState(() => ({
    jobs: deferredResources.includes("jobs"),
    monitors: deferredResources.includes("monitors"),
    sources: deferredResources.includes("sources"),
    runs: deferredResources.includes("runs"),
  }));
  const [filters, setFilters] = useState(false);
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [runFilter, setRunFilter] = useState<string | null>(null);
  const [runScope, setRunScope] = useState<"all" | "new">("all");
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
  const [linkedInSort, setLinkedInSort] = useState<LinkedInSort>("relevant");
  const [linkedInDistance, setLinkedInDistance] =
    useState<LinkedInDistance>("25");
  const [linkedInEasyApply, setLinkedInEasyApply] = useState(false);
  const [linkedInUnderTen, setLinkedInUnderTen] = useState(false);
  const [modal, setModalState] = useState<Modal>(null);
  const [jobDetailLoading, setJobDetailLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [accountMenu, setAccountMenu] = useState<"top" | "sidebar" | null>(
    null,
  );
  const [profileName, setProfileName] = useState(initialData?.user?.name || "");
  const [localCvState, setLocalCvState] = useState<{
    userId: string;
    profile: CvProfile;
  } | null>(null);
  const [cvRevision, setCvRevision] = useState(0);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvLoadError, setCvLoadError] = useState(false);
  const [cvRetry, setCvRetry] = useState(0);
  const cvUserId = data?.user?.id || "demo";
  const localCv =
    localCvState?.userId === cvUserId ? localCvState.profile : null;
  const setLocalCv = (profile: CvProfile | null) =>
    setLocalCvState(profile ? { userId: cvUserId, profile } : null);
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
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(Boolean(initialData));
  const revisionsRef = useRef<Revisions>(initialRevisions);
  const revisionsEtagRef = useRef("");
  const modalHistoryRef = useRef(false);
  const deepLinkJobRef = useRef(false);
  const readJson = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { cache: "no-store", ...init });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.replace(`/auth?next=${next}`);
      throw new Error("Sign in required.");
    }
    if (!response.ok)
      throw new Error(result.error || "The workspace could not be loaded.");
    return result;
  }, []);
  const refresh = useCallback(async () => {
    if (hasLoadedRef.current) setRefreshing(true);
    try {
      const summary = await readJson("/api/workspace/summary");
      if (!summary.user?.onboardingCompleted) {
        router.replace("/onboarding");
        return;
      }
      const owner = summary.user.role === "owner";
      const [jobsResult, monitors, sources, runs] = await Promise.all([
        readJson("/api/jobs?limit=50"),
        readJson("/api/monitors"),
        owner ? readJson("/api/sources") : Promise.resolve([]),
        owner ? readJson("/api/runs") : Promise.resolve([]),
      ]);
      const result: DashboardData = {
        mode: "live",
        jobs: jobsResult.items,
        monitors,
        sources,
        runs: runs.map((run: DashboardData["runs"][number]) => ({
          ...run,
          jobIds: [],
          newJobIds: [],
        })),
        authenticated: true,
        user: summary.user,
        summary: summary.counts,
      };
      revisionsRef.current = summary.revisions || {};
      setJobsNextCursor(jobsResult.nextCursor || null);
      setJobsTotal(jobsResult.total || 0);
      setData(result);
      setResourceLoading({
        jobs: false,
        monitors: false,
        sources: false,
        runs: false,
      });
      setProfileName(result.user?.name || "");
      hasLoadedRef.current = true;
      setNow(Date.now());
      setError("");
    } finally {
      setRefreshing(false);
    }
  }, [readJson, router]);

  const checkRevisions = useCallback(async () => {
    if (!hasLoadedRef.current || document.visibilityState !== "visible") return;
    const response = await fetch("/api/revisions", {
      cache: "no-store",
      headers: revisionsEtagRef.current
        ? { "If-None-Match": revisionsEtagRef.current }
        : undefined,
    });
    if (response.status === 304) return;
    if (!response.ok) return;
    revisionsEtagRef.current = response.headers.get("etag") || "";
    const next = (await response.json()).revisions as Revisions;
    const previous = revisionsRef.current;
    if (Object.keys(next).some((scope) => next[scope] !== previous[scope]))
      await refresh();
    revisionsRef.current = next;
  }, [refresh]);
  useEffect(() => {
    const initial = initialData
      ? undefined
      : setTimeout(() => refresh().catch((e) => setError(e.message)), 0);
    const timer = setInterval(() => void checkRevisions(), 15 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkRevisions();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      if (initial) clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [checkRevisions, initialData, refresh]);
  const resourceUserRole =
    data?.mode === "live" ? data.user?.role || null : null;
  useEffect(() => {
    if (
      !resourceUserRole ||
      !resourceLoading.monitors ||
      !["overview", "jobs", "saved", "monitors"].includes(view)
    )
      return;
    const controller = new AbortController();
    void readJson("/api/monitors", { signal: controller.signal })
      .then((monitors) => {
        setData((current) =>
          current
            ? { ...current, monitors: monitors as DashboardData["monitors"] }
            : current,
        );
        setResourceLoading((current) => ({ ...current, monitors: false }));
      })
      .catch((cause) => {
        if ((cause as Error).name !== "AbortError") {
          setError((cause as Error).message);
          setResourceLoading((current) => ({ ...current, monitors: false }));
        }
      });
    return () => controller.abort();
  }, [readJson, resourceLoading.monitors, resourceUserRole, view]);
  useEffect(() => {
    if (
      !resourceUserRole ||
      !resourceLoading.sources ||
      !["overview", "jobs", "saved", "sources", "intelligence"].includes(view)
    )
      return;
    if (resourceUserRole !== "owner") {
      void Promise.resolve().then(() =>
        setResourceLoading((current) => ({ ...current, sources: false })),
      );
      return;
    }
    const controller = new AbortController();
    void readJson("/api/sources", { signal: controller.signal })
      .then((sources) => {
        setData((current) =>
          current
            ? { ...current, sources: sources as DashboardData["sources"] }
            : current,
        );
        setResourceLoading((current) => ({ ...current, sources: false }));
      })
      .catch((cause) => {
        if ((cause as Error).name !== "AbortError") {
          setError((cause as Error).message);
          setResourceLoading((current) => ({ ...current, sources: false }));
        }
      });
    return () => controller.abort();
  }, [readJson, resourceLoading.sources, resourceUserRole, view]);
  useEffect(() => {
    if (!resourceUserRole || !resourceLoading.runs || view !== "activity")
      return;
    if (resourceUserRole !== "owner") {
      void Promise.resolve().then(() =>
        setResourceLoading((current) => ({ ...current, runs: false })),
      );
      return;
    }
    const controller = new AbortController();
    void readJson("/api/runs", { signal: controller.signal })
      .then((result) => {
        const runs = result as DashboardData["runs"];
        setData((current) =>
          current
            ? {
                ...current,
                runs: runs.map((run) => ({
                  ...run,
                  jobIds: [],
                  newJobIds: [],
                })),
              }
            : current,
        );
        setResourceLoading((current) => ({ ...current, runs: false }));
      })
      .catch((cause) => {
        if ((cause as Error).name !== "AbortError") {
          setError((cause as Error).message);
          setResourceLoading((current) => ({ ...current, runs: false }));
        }
      });
    return () => controller.abort();
  }, [readJson, resourceLoading.runs, resourceUserRole, view]);
  useEffect(() => {
    if (!data?.user?.id || (view !== "cv" && modal?.type !== "job")) return;
    let active = true;
    fetch("/api/candidate/cv", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your saved CV could not be loaded.");
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        setLocalCvState(
          result.cv?.profile
            ? { userId: cvUserId, profile: result.cv.profile }
            : null,
        );
        setCvRevision(result.cv?.revision || 0);
      })
      .catch(() => {
        if (active) setCvLoadError(true);
      })
      .finally(() => {
        if (active) setCvLoading(false);
      });
    return () => {
      active = false;
    };
  }, [data?.user?.id, cvUserId, cvRetry, modal?.type, view]);
  useEffect(() => {
    if (!data || deepLinkJobRef.current || typeof window === "undefined")
      return;
    const jobId = new URLSearchParams(window.location.search).get("job");
    if (!jobId) return;
    const job = data.jobs.find((item) => item.id === jobId);
    if (!job) return;
    deepLinkJobRef.current = true;
    const timer = setTimeout(() => setModalState({ type: "job", job }), 0);
    return () => clearTimeout(timer);
  }, [data]);
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
    document.documentElement.classList.toggle(
      "jobradar-dark",
      theme === "dark",
    );
    document.documentElement.classList.toggle(
      "jobradar-light",
      theme === "light",
    );
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
      if (event.key === "Escape") {
        setMobileNav(false);
        setAccountMenu(null);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!accountMenu) return;
    const closeOutside = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenu(null);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [accountMenu]);
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
      setTab(next === "jobs" || next === "overview" ? "matched" : "all");
      setPage(1);
      setMonitorFilter("all");
      setQuery("");
      setRegion("all");
      setSourceFilter("all");
      const params = new URLSearchParams(window.location.search);
      const historyRun = params.get("run");
      setRunFilter(historyRun);
      setRunScope(params.get("scope") === "new" ? "new" : "all");
      if (historyRun) setTab("all");
      setMobileNav(false);
    };
    const initial = window.setTimeout(() => {
      const initialParams = new URLSearchParams(window.location.search);
      const initialRun = initialParams.get("run");
      setRunFilter(initialRun);
      setRunScope(initialParams.get("scope") === "new" ? "new" : "all");
      if (initialRun) setTab("all");
    }, 0);
    window.addEventListener("popstate", syncViewFromPath);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("popstate", syncViewFromPath);
    };
  }, []);
  const jobs = useMemo(
    () =>
      data?.jobs.map((j) => ({
        ...j,
        matchedMonitors:
          data.mode === "live"
            ? j.matchedMonitors
            : data.monitors
                .filter((m) =>
                  matchesMonitor(j, m, data.user?.preferences.experience),
                )
                .map((m) => m.id),
      })) || [],
    [data],
  );
  const ownerAccess = data?.mode === "demo" || data?.user?.role === "owner";
  const activeTab =
    !ownerAccess && tab === "all" && view !== "saved" ? "matched" : tab;
  const jobRequestParams = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (query.trim()) params.set("q", query.trim());
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (monitorFilter !== "all") params.set("monitor", monitorFilter);
      if (activeTab === "matched") params.set("matched", "true");
      if (activeTab === "archived") params.set("status", "archived");
      if (activeTab === "applied") params.set("status", "applied");
      if (activeTab === "new") params.set("status", "unreviewed");
      if (view === "saved" && activeTab === "all")
        params.set("status", "shortlist");
      if (region === "remote") params.set("mode", "remote");
      if (region === "sri-lanka") params.set("location", "Sri Lanka");
      return params;
    },
    [activeTab, monitorFilter, query, region, sourceFilter, view],
  );
  useEffect(() => {
    if (!hasLoadedRef.current || runFilter) return;
    if (!["overview", "jobs", "saved"].includes(view)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        const params = jobRequestParams();
        void fetch(`/api/jobs?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (response) => {
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.error || "Jobs could not be loaded.");
            setData((current) =>
              current ? { ...current, jobs: result.items } : current,
            );
            setJobsNextCursor(result.nextCursor || null);
            setJobsTotal(result.total || 0);
            setResourceLoading((current) => ({ ...current, jobs: false }));
            const visibleParams = new URLSearchParams(window.location.search);
            for (const key of [
              "q",
              "source",
              "monitor",
              "status",
              "mode",
              "location",
            ])
              visibleParams.delete(key);
            params.forEach((value, key) => {
              if (key !== "limit" && key !== "matched")
                visibleParams.set(key, value);
            });
            window.history.replaceState(
              window.history.state,
              "",
              `${window.location.pathname}${visibleParams.size ? `?${visibleParams}` : ""}`,
            );
          })
          .catch((cause) => {
            if (cause.name !== "AbortError") {
              setError(cause.message);
              setResourceLoading((current) => ({ ...current, jobs: false }));
            }
          });
      },
      resourceLoading.jobs ? 0 : 250,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [jobRequestParams, resourceLoading.jobs, runFilter, view]);

  async function loadMoreJobs() {
    if (!jobsNextCursor) return;
    const params = jobRequestParams(jobsNextCursor);
    const result = await readJson(`/api/jobs?${params}`);
    setData((current) =>
      current
        ? {
            ...current,
            jobs: [
              ...current.jobs,
              ...(result.items as Job[]).filter(
                (job) =>
                  !current.jobs.some((existing) => existing.id === job.id),
              ),
            ],
          }
        : current,
    );
    setJobsNextCursor(result.nextCursor || null);
    setJobsTotal(result.total || 0);
    setPage((value) => value + 1);
  }
  const selectedRun = data?.runs.find((run) => run.id === runFilter);
  const selectedRunJobIds = useMemo(
    () =>
      selectedRun
        ? new Set(
            runScope === "new" ? selectedRun.newJobIds : selectedRun.jobIds,
          )
        : null,
    [runScope, selectedRun],
  );
  const contextJobs = selectedRunJobIds
    ? jobs.filter((job) => selectedRunJobIds.has(job.id))
    : jobs;
  const filtered = useMemo(
    () =>
      jobs
        .filter((j) => {
          const text =
            `${j.title} ${j.company} ${j.tags.join(" ")} ${j.location}`.toLowerCase();
          return (
            (!query || text.includes(query.toLowerCase())) &&
            (!selectedRunJobIds || selectedRunJobIds.has(j.id)) &&
            (view === "saved"
              ? j.status === "saved" || j.status === "applied"
              : activeTab === "archived"
                ? j.status === "archived"
                : selectedRun && activeTab === "all"
                  ? true
                  : j.status !== "archived") &&
            (region === "all" ||
              (region === "remote"
                ? j.remote
                : /sri lanka|colombo|kandy|galle/i.test(j.location))) &&
            (sourceFilter === "all" || j.sourceId === sourceFilter) &&
            (monitorFilter === "all" ||
              j.matchedMonitors.includes(monitorFilter)) &&
            (activeTab !== "matched" || j.matchedMonitors.length > 0) &&
            (activeTab !== "new" || !j.reviewed) &&
            (activeTab !== "applied" || j.status === "applied")
          );
        })
        .sort((a, b) =>
          sort === "company"
            ? a.company.localeCompare(b.company)
            : new Date(b.publishedAt || b.firstSeenAt).getTime() -
              new Date(a.publishedAt || a.firstSeenAt).getTime(),
        ),
    [
      jobs,
      query,
      view,
      region,
      sourceFilter,
      monitorFilter,
      activeTab,
      sort,
      selectedRun,
      selectedRunJobIds,
    ],
  );
  const resultTotal = selectedRun ? filtered.length : jobsTotal;
  const totalPages = Math.max(1, Math.ceil(resultTotal / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = resultTotal ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, resultTotal);
  const paginatedJobs = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const queryText = query.trim().toLowerCase();
  const filteredMonitors = useMemo(
    () =>
      data?.monitors.filter((monitor) => {
        const text =
          `${monitor.name} ${monitor.keywords.join(" ")} ${monitor.excludedKeywords.join(" ")} ${monitor.location}`.toLowerCase();
        return (
          (!queryText || text.includes(queryText)) &&
          (workspaceFilter === "all" ||
            (workspaceFilter === "enabled"
              ? monitor.enabled
              : !monitor.enabled))
        );
      }) || [],
    [data?.monitors, queryText, workspaceFilter],
  );
  const filteredSources = useMemo(
    () =>
      data?.sources.filter((source) => {
        const text =
          `${source.name} ${kindNames[source.kind]} ${source.board}`.toLowerCase();
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
        const text =
          `${run.sourceName} ${run.status} ${run.error || ""}`.toLowerCase();
        return (
          (!queryText || text.includes(queryText)) &&
          (workspaceFilter === "all" || run.status === workspaceFilter)
        );
      }) || [],
    [data?.runs, queryText, workspaceFilter],
  );
  const monitorPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredMonitors.length / pageSize)),
  );
  const sourcePage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredSources.length / pageSize)),
  );
  const runPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredRuns.length / pageSize)),
  );
  const paginatedMonitors = filteredMonitors.slice(
    (monitorPage - 1) * pageSize,
    monitorPage * pageSize,
  );
  const paginatedSources = filteredSources.slice(
    (sourcePage - 1) * pageSize,
    sourcePage * pageSize,
  );
  const paginatedRuns = filteredRuns.slice(
    (runPage - 1) * pageSize,
    runPage * pageSize,
  );

  function navigate(next: View, event?: React.MouseEvent<HTMLElement>) {
    event?.preventDefault();
    setView(next);
    setTab(next === "jobs" || next === "overview" ? "matched" : "all");
    setPage(1);
    setMonitorFilter("all");
    setQuery("");
    setRegion("all");
    setSourceFilter("all");
    setRunFilter(null);
    setRunScope("all");
    setWorkspaceFilter("all");
    setMobileNav(false);
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== viewPaths[next]
    ) {
      window.history.pushState({ view: next }, "", viewPaths[next]);
    }
  }
  async function viewRun(runId: string, scope: "all" | "new" = "all") {
    try {
      const result = await readJson(
        `/api/runs/${encodeURIComponent(runId)}/jobs?limit=50&scope=${scope}`,
      );
      const runJobs = result.items as Job[];
      setData((current) =>
        current
          ? {
              ...current,
              jobs: [
                ...runJobs,
                ...current.jobs.filter(
                  (job) => !runJobs.some((runJob) => runJob.id === job.id),
                ),
              ],
              runs: current.runs.map((run) =>
                run.id === runId
                  ? {
                      ...run,
                      ...(scope === "new"
                        ? { newJobIds: runJobs.map((job) => job.id) }
                        : { jobIds: runJobs.map((job) => job.id) }),
                    }
                  : run,
              ),
            }
          : current,
      );
    } catch (cause) {
      setToast((cause as Error).message);
      return;
    }
    navigate("jobs");
    setRunFilter(runId);
    setRunScope(scope);
    setTab(ownerAccess ? "all" : "matched");
    if (typeof window !== "undefined") {
      window.history.replaceState(
        { view: "jobs", run: runId, scope },
        "",
        `/app/jobs?run=${encodeURIComponent(runId)}${scope === "new" ? "&scope=new" : ""}`,
      );
    }
  }
  function openModal(next: Exclude<Modal, null>) {
    if (next.type === "job" && !next.job.reviewed) {
      setData((current) =>
        current
          ? {
              ...current,
              jobs: current.jobs.map((job) =>
                job.id === next.job.id ? { ...job, reviewed: true } : job,
              ),
            }
          : current,
      );
      void action("job-reviewed", next.job.id).catch((cause) =>
        setToast(cause.message),
      );
    }
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
    if (next.type === "job" && data?.mode === "live" && !next.job.description) {
      const jobId = next.job.id;
      setJobDetailLoading(jobId);
      void fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error || "The opportunity could not be loaded.",
            );
          setData((current) =>
            current
              ? {
                  ...current,
                  jobs: current.jobs.map((job) =>
                    job.id === jobId ? result.job : job,
                  ),
                }
              : current,
          );
          setModalState((current) =>
            current?.type === "job" && current.job.id === jobId
              ? { type: "job", job: result.job }
              : current,
          );
        })
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "The opportunity could not be loaded.",
          ),
        )
        .finally(() =>
          setJobDetailLoading((current) =>
            current === jobId ? null : current,
          ),
        );
    }
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
          j.id === id
            ? { ...j, status: value as JobStatus, reviewed: true }
            : j,
        );
      if (actionName === "job-reviewed")
        next.jobs = data.jobs.map((j) =>
          j.id === id ? { ...j, reviewed: true } : j,
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
    if (!data.authenticated)
      throw new Error("Sign in to manage this workspace.");
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, id, data: value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (actionName === "job-status") {
      setData((current) =>
        current
          ? {
              ...current,
              jobs: current.jobs.map((job) =>
                job.id === id
                  ? {
                      ...job,
                      status: value as JobStatus,
                      reviewed: true,
                      appliedAt:
                        value === "applied"
                          ? job.appliedAt || new Date().toISOString()
                          : job.appliedAt,
                    }
                  : job,
              ),
            }
          : current,
      );
      const [summary, jobsResult] = await Promise.all([
        readJson("/api/workspace/summary"),
        readJson(`/api/jobs?${jobRequestParams()}`),
      ]);
      setData((current) =>
        current
          ? {
              ...current,
              jobs: jobsResult.items,
              summary: summary.counts,
            }
          : current,
      );
      setJobsNextCursor(jobsResult.nextCursor || null);
      setJobsTotal(jobsResult.total || 0);
      setPage(1);
    } else if (actionName === "job-reviewed") {
      setData((current) =>
        current
          ? {
              ...current,
              jobs: current.jobs.map((job) =>
                job.id === id ? { ...job, reviewed: true } : job,
              ),
            }
          : current,
      );
      const [summary, jobsResult] = await Promise.all([
        readJson("/api/workspace/summary"),
        readJson(`/api/jobs?${jobRequestParams()}`),
      ]);
      setData((current) =>
        current
          ? {
              ...current,
              jobs: jobsResult.items,
              summary: summary.counts,
            }
          : current,
      );
      setJobsNextCursor(jobsResult.nextCursor || null);
      setJobsTotal(jobsResult.total || 0);
      setPage(1);
    } else if (actionName === "job-note")
      setData((current) =>
        current
          ? {
              ...current,
              jobs: current.jobs.map((job) =>
                job.id === id
                  ? { ...job, applicationNote: String(value || "") }
                  : job,
              ),
            }
          : current,
      );
    else if (actionName === "profile-update")
      setData((current) =>
        current?.user
          ? {
              ...current,
              user: {
                ...current.user,
                name: (value as { name?: string })?.name ?? current.user.name,
                jevApiKeyConfigured:
                  typeof (value as { jevApiKey?: unknown })?.jevApiKey ===
                  "string"
                    ? Boolean((value as { jevApiKey: string }).jevApiKey)
                    : current.user.jevApiKeyConfigured,
                preferences: {
                  ...current.user.preferences,
                  ...(typeof (value as { aiAnalysisEnabled?: unknown })
                    ?.aiAnalysisEnabled === "boolean"
                    ? {
                        aiAnalysisEnabled: (
                          value as { aiAnalysisEnabled: boolean }
                        ).aiAnalysisEnabled,
                      }
                    : {}),
                },
              },
            }
          : current,
      );
    else if (actionName.startsWith("monitor-")) {
      const [monitors, summary] = await Promise.all([
        readJson("/api/monitors"),
        readJson("/api/workspace/summary"),
      ]);
      setData((current) =>
        current ? { ...current, monitors, summary: summary.counts } : current,
      );
    } else if (actionName.startsWith("source-")) {
      const sources = await readJson("/api/sources");
      setData((current) => (current ? { ...current, sources } : current));
    } else if (actionName === "sync") await refresh();
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
  const isOwner = ownerAccess;
  const preferences = data.user?.preferences || {};
  const preferenceRoles = preferences.roles || [];
  const preferenceLocations = preferences.locations || [];
  const preferenceWorkModes = preferences.workModes || [];
  const focusLocationLabel = preferenceLocations.length
    ? preferenceLocations.length > 2
      ? `${preferenceLocations.slice(0, 2).join(" & ")} +${preferenceLocations.length - 2}`
      : preferenceLocations.join(" & ")
    : "Sri Lanka & remote";
  const focusRoleLabel = preferenceRoles.length
    ? preferenceRoles.slice(0, 3).join(", ")
    : "your active monitor roles";
  const jobViews = ["overview", "jobs", "saved"].includes(view);
  const overviewLoading =
    view === "overview" &&
    (resourceLoading.jobs ||
      resourceLoading.monitors ||
      resourceLoading.sources);
  const opportunityLoading =
    (view === "jobs" || view === "saved") && resourceLoading.jobs;
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
  const linkedInPostSearchUrls = {
    sriLanka: linkedInJobPostsSearchUrl({
      monitor: linkedInMonitor,
      query: jobViews ? query : linkedInQuery,
      audience: "sri-lanka",
    }),
    qatarNetwork: linkedInJobPostsSearchUrl({
      monitor: linkedInMonitor,
      query: jobViews ? query : linkedInQuery,
      audience: "qatar",
      firstDegreeOnly: true,
    }),
    global: linkedInJobPostsSearchUrl({
      monitor: linkedInMonitor,
      query: jobViews ? query : linkedInQuery,
      audience: "global",
    }),
  };
  const savedCount =
    data.summary?.saved ?? jobs.filter((j) => j.status === "saved").length;
  const appliedCount =
    data.summary?.applied ?? jobs.filter((j) => j.status === "applied").length;
  const relevantCount =
    data.summary?.relevant ??
    jobs.filter((j) => j.matchedMonitors.length > 0).length;
  const collectedCount = data.summary?.totalCollected ?? jobs.length;
  const unreviewedCount =
    data.summary?.unreviewed ?? jobs.filter((j) => !j.reviewed).length;
  const archivedCount =
    data.summary?.archived ??
    jobs.filter((j) => j.status === "archived").length;
  const newCount =
    data.summary?.newToday ??
    jobs.filter((j) => now - new Date(j.firstSeenAt).getTime() < 86400000)
      .length;
  const liveSources = data.sources.filter((s) => s.enabled);
  const signOut = async () => {
    setAccountMenu(null);
    const response = await fetch("/api/auth", { method: "DELETE" });
    if (response.ok) {
      setData(null);
      router.replace("/auth");
      router.refresh();
    }
  };
  const accountMenuContent = (
    <div className="account-menu" role="menu" aria-label="Account menu">
      <div className="account-menu-header">
        <span className="account-menu-avatar">
          {accountInitials(data.user?.name || "Your workspace")}
        </span>
        <span>
          <strong>{data.user?.name || "Your workspace"}</strong>
          <small>{data.user?.email || "Demo workspace"}</small>
        </span>
        <em>
          {data.mode === "demo"
            ? "Demo"
            : data.user?.role === "owner"
              ? "Owner"
              : "Member"}
        </em>
      </div>
      <div className="account-menu-items">
        <button
          role="menuitem"
          onClick={() => {
            setAccountMenu(null);
            navigate("cv");
          }}
        >
          <FileText size={16} />
          <span>
            <strong>My CV</strong>
            <small>View and edit your career profile</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <button
          role="menuitem"
          onClick={() => {
            setAccountMenu(null);
            navigate("settings");
          }}
        >
          <Settings2 size={16} />
          <span>
            <strong>Workspace settings</strong>
            <small>Account and connection details</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <button
          role="menuitem"
          onClick={() => {
            setAccountMenu(null);
            openModal({ type: "help" });
          }}
        >
          <CircleHelp size={16} />
          <span>
            <strong>Help and guidance</strong>
            <small>Review the workspace workflow</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <Link href="/" role="menuitem" onClick={() => setAccountMenu(null)}>
          <ArrowUpRight size={16} />
          <span>
            <strong>Public home</strong>
            <small>Open the Jobradar overview</small>
          </span>
          <ChevronRight size={14} />
        </Link>
      </div>
      {data.mode === "live" && (
        <button
          className="account-menu-signout"
          role="menuitem"
          onClick={signOut}
        >
          <LogOut size={16} /> Sign out
        </button>
      )}
    </div>
  );
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
          {navigation
            .filter((item) => item.id !== "intelligence" || isOwner)
            .map((item) => (
              <Link
                key={item.id}
                href={viewPaths[item.id]}
                onClick={(event) => navigate(item.id, event)}
                className={`nav-item ${view === item.id ? "selected" : ""}`}
                aria-current={view === item.id ? "page" : undefined}
                data-tooltip={
                  item.id === "jobs" && !isOwner
                    ? "My opportunities"
                    : item.label
                }
              >
                <item.icon size={18} />
                <span>
                  {item.id === "jobs" && !isOwner
                    ? "My opportunities"
                    : item.label}
                </span>
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
          href={viewPaths.settings}
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
        <div
          className="profile account-menu-anchor sidebar-account-anchor"
          ref={accountMenu === "sidebar" ? accountMenuRef : undefined}
        >
          <button
            className="profile-summary"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenu === "sidebar"}
            onClick={() =>
              setAccountMenu((current) =>
                current === "sidebar" ? null : "sidebar",
              )
            }
          >
            <span
              className="profile-avatar"
              data-tooltip={data.user?.name || "Your workspace"}
            >
              {accountInitials(data.user?.name || "Your workspace")}
            </span>
            <span className="profile-copy">
              <strong>{data.user?.name || "Your workspace"}</strong>
              <small>
                {data.mode === "demo"
                  ? "Demo explorer"
                  : data.user?.email || "Workspace member"}
              </small>
            </span>
            <MoreHorizontal className="profile-more" size={18} />
          </button>
          {accountMenu === "sidebar" && accountMenuContent}
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
              <Globe2 size={14} /> {focusLocationLabel}
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
            <div
              className="account-menu-anchor top-account-anchor"
              ref={accountMenu === "top" ? accountMenuRef : undefined}
            >
              <button
                className="top-account"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={accountMenu === "top"}
                onClick={() =>
                  setAccountMenu((current) =>
                    current === "top" ? null : "top",
                  )
                }
              >
                <span className="top-avatar">
                  {accountInitials(data.user?.name || "Your workspace")}
                </span>
                <span className="top-account-copy">
                  <strong>{data.user?.name || "Your workspace"}</strong>
                  <small>
                    {data.mode === "demo"
                      ? "Demo explorer"
                      : data.user?.role === "owner"
                        ? "Workspace owner"
                        : "Workspace member"}
                  </small>
                </span>
              </button>
              {accountMenu === "top" && accountMenuContent}
            </div>
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
              <h1>
                {view === "jobs" && selectedRun
                  ? `${runScope === "new" ? "New jobs" : "Jobs found"} by ${selectedRun.sourceName}.`
                  : view === "overview"
                    ? `Role matches for ${focusLocationLabel}.`
                    : view === "monitors"
                      ? "Your personal monitors."
                      : view === "jobs" && !isOwner
                        ? "Opportunities matched to you."
                        : titles[view][0]}
              </h1>
              <p>
                {view === "jobs" && selectedRun
                  ? `${dateTime(selectedRun.startedAt)} · ${selectedRun.fetched} collected · ${selectedRun.added} new in this run.`
                  : view === "overview"
                    ? `Focused on ${focusRoleLabel} from your saved preferences.`
                    : view === "monitors"
                      ? "Add, edit, pause, or remove the searches that shape your Relevant feed."
                      : view === "jobs" && !isOwner
                        ? "Review roles selected by your personal monitors, then save, apply, or archive them."
                        : titles[view][1]}
              </p>
            </div>
            {view === "jobs" && selectedRun ? (
              <button className="btn" onClick={() => navigate("jobs")}>
                <X size={15} /> Clear run filter
              </button>
            ) : (
              view !== "monitors" &&
              view !== "sources" &&
              view !== "activity" &&
              view !== "cv" &&
              view !== "settings" &&
              view !== "intelligence" && (
                <button
                  className="btn primary"
                  onClick={() => openModal({ type: "monitor" })}
                >
                  <Plus size={17} />
                  Create monitor
                </button>
              )
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
          {overviewLoading && <WorkspaceContentSkeleton kind="overview" />}
          {view === "overview" && !overviewLoading && (
            <OverviewView
              relevantCount={relevantCount}
              isOwner={isOwner}
              collectedCount={collectedCount}
              newCount={newCount}
              activeMonitors={activeMonitors}
              liveSources={liveSources}
              savedCount={savedCount}
              appliedCount={appliedCount}
              navigate={navigate}
              data={data}
            />
          )}
          {opportunityLoading && (
            <WorkspaceContentSkeleton kind={view as "jobs" | "saved"} />
          )}
          {jobViews && !overviewLoading && !opportunityLoading && (
            <JobsView
              view={view}
              resultTotal={resultTotal}
              isOwner={isOwner}
              sync={sync}
              busy={busy}
              exportJobs={exportJobs}
              setTab={setTab}
              setPage={setPage}
              activeTab={activeTab}
              savedCount={savedCount}
              appliedCount={appliedCount}
              selectedRun={selectedRun}
              contextJobs={contextJobs}
              collectedCount={collectedCount}
              filtered={filtered}
              relevantCount={relevantCount}
              unreviewedCount={unreviewedCount}
              archivedCount={archivedCount}
              searchRef={searchRef}
              query={query}
              setQuery={setQuery}
              filters={filters}
              setFilters={setFilters}
              region={region}
              sourceFilter={sourceFilter}
              monitorFilter={monitorFilter}
              sort={sort}
              setSort={setSort}
              setRegion={setRegion}
              setSourceFilter={setSourceFilter}
              data={data}
              setMonitorFilter={setMonitorFilter}
              linkedInSearchUrl={linkedInSearchUrl}
              linkedInMonitor={linkedInMonitor}
              paginatedJobs={paginatedJobs}
              openModal={openModal}
              now={now}
              changeStatus={changeStatus}
              jobs={jobs}
              navigate={navigate}
              pageStart={pageStart}
              pageEnd={pageEnd}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              totalPages={totalPages}
              jobsNextCursor={jobsNextCursor}
              loadMoreJobs={loadMoreJobs}
              setError={setError}
              focusMonitor={focusMonitor}
              liveSources={liveSources}
            />
          )}
          {view === "monitors" && resourceLoading.monitors && (
            <WorkspaceContentSkeleton kind="monitors" />
          )}
          {view === "monitors" && !resourceLoading.monitors && (
            <MonitorsView
              filteredMonitors={filteredMonitors}
              data={data}
              setWorkspaceFilter={setWorkspaceFilter}
              setPage={setPage}
              workspaceFilter={workspaceFilter}
              query={query}
              setQuery={setQuery}
              openModal={openModal}
              paginatedMonitors={paginatedMonitors}
              jobs={jobs}
              focusMonitor={focusMonitor}
              action={action}
              setToast={setToast}
              monitorPage={monitorPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          )}
          {view === "sources" && resourceLoading.sources && (
            <WorkspaceContentSkeleton kind="sources" />
          )}
          {view === "sources" && !resourceLoading.sources && (
            <SourcesView
              isOwner={isOwner}
              linkedInMonitor={linkedInMonitor}
              setMonitorFilter={setMonitorFilter}
              data={data}
              linkedInQuery={linkedInQuery}
              setLinkedInQuery={setLinkedInQuery}
              linkedInLocation={linkedInLocation}
              setLinkedInLocation={setLinkedInLocation}
              linkedInWorkplace={linkedInWorkplace}
              setLinkedInWorkplace={setLinkedInWorkplace}
              linkedInExperience={linkedInExperience}
              setLinkedInExperience={setLinkedInExperience}
              linkedInJobType={linkedInJobType}
              setLinkedInJobType={setLinkedInJobType}
              linkedInDatePosted={linkedInDatePosted}
              setLinkedInDatePosted={setLinkedInDatePosted}
              linkedInSort={linkedInSort}
              setLinkedInSort={setLinkedInSort}
              linkedInDistance={linkedInDistance}
              setLinkedInDistance={setLinkedInDistance}
              linkedInEasyApply={linkedInEasyApply}
              setLinkedInEasyApply={setLinkedInEasyApply}
              linkedInUnderTen={linkedInUnderTen}
              setLinkedInUnderTen={setLinkedInUnderTen}
              linkedInSearchUrl={linkedInSearchUrl}
              linkedInNetworkSearchUrl={linkedInNetworkSearchUrl}
              linkedInPostSearchUrls={linkedInPostSearchUrls}
              setWorkspaceFilter={setWorkspaceFilter}
              setPage={setPage}
              workspaceFilter={workspaceFilter}
              query={query}
              setQuery={setQuery}
              sync={sync}
              busy={busy}
              openModal={openModal}
              filteredSources={filteredSources}
              liveSources={liveSources}
              paginatedSources={paginatedSources}
              action={action}
              setToast={setToast}
              sourcePage={sourcePage}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          )}
          {view === "activity" && resourceLoading.runs && (
            <WorkspaceContentSkeleton kind="activity" />
          )}
          {view === "activity" && !resourceLoading.runs && (
            <ActivityView
              data={data}
              setWorkspaceFilter={setWorkspaceFilter}
              setPage={setPage}
              workspaceFilter={workspaceFilter}
              query={query}
              setQuery={setQuery}
              isOwner={isOwner}
              sync={sync}
              busy={busy}
              filteredRuns={filteredRuns}
              paginatedRuns={paginatedRuns}
              viewRun={viewRun}
              runPage={runPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          )}
          {view === "settings" && (
            <SettingsView
              isOwner={isOwner}
              data={data}
              profileName={profileName}
              setProfileName={setProfileName}
              action={action}
              setToast={setToast}
              signOut={signOut}
              preferences={preferences}
              preferenceRoles={preferenceRoles}
              preferenceLocations={preferenceLocations}
              preferenceWorkModes={preferenceWorkModes}
              navigate={navigate}
            />
          )}
          {view === "intelligence" && isOwner && data.mode === "live" && (
            <div className="intelligence-page">
              <div className="info-panel">
                <h3>What these controls do</h3>
                <p>
                  JEV evaluates collected jobs in shadow mode. Source rules
                  decide when a reviewed model field may influence matching;
                  corrections record a reason for changing an individual label.
                  They do not compare a person’s CV with a job. Open a job and
                  choose Review with JEV for that private comparison.
                </p>
              </div>
              <IntelligenceControls sources={data.sources} />
            </div>
          )}
          {view === "intelligence" && !isOwner && (
            <div className="info-panel">
              <h3>Owner controls</h3>
              <p>
                Only the workspace owner can manage shared JEV rollout rules.
              </p>
              <button className="btn" onClick={() => navigate("settings")}>
                Back to settings
              </button>
            </div>
          )}
          {view === "cv" && (
            <div className="cv-page">
              {cvLoading ? (
                <WorkspaceContentSkeleton kind="cv" />
              ) : cvLoadError ? (
                <div className="settings-card cv-page-loading">
                  <div>
                    <strong>Your CV is temporarily unavailable</strong>
                    <p>Try loading your saved profile again.</p>
                    <button
                      className="btn"
                      onClick={() => {
                        setCvLoadError(false);
                        setCvLoading(true);
                        setCvRetry((value) => value + 1);
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : (
                <CvWorkspace
                  key={cvUserId}
                  profile={localCv}
                  onChange={setLocalCv}
                  revision={cvRevision}
                  onSaved={setCvRevision}
                />
              )}
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
          wide={modal.type === "job"}
          title={
            modal.type === "monitor"
              ? modal.monitor
                ? "Fine-tune your monitor"
                : "A new direction to explore"
              : modal.type === "source"
                ? "Connect a new source"
                : modal.type === "job"
                  ? "Opportunity details"
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
              key={modal.job.id}
              job={jobs.find((j) => j.id === modal.job.id) || modal.job}
              loading={jobDetailLoading === modal.job.id}
              demo={data.mode === "demo"}
              owner={isOwner}
              aiAnalysisEnabled={
                data.user?.preferences.aiAnalysisEnabled !== false
              }
              localSkillMatches={
                localCv
                  ? cvSkillTerms(localCv)
                      .filter((skill) =>
                        containsKeyword(
                          plainText(
                            (
                              jobs.find((item) => item.id === modal.job.id) ||
                              modal.job
                            ).description || "",
                          ),
                          skill,
                        ),
                      )
                      .slice(0, 16)
                  : []
              }
              matchedMonitorNames={data.monitors
                .filter((monitor) =>
                  (
                    jobs.find((item) => item.id === modal.job.id) || modal.job
                  ).matchedMonitors.includes(monitor.id),
                )
                .map((monitor) => monitor.name)}
              onStatus={changeStatus}
              onNote={async (job, note) => {
                try {
                  await action("job-note", job.id, note);
                  setToast("Application note saved.");
                } catch (cause) {
                  setToast((cause as Error).message);
                }
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

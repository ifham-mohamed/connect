"use client";
import type { DashboardData, Job, JobStatus, Monitor } from "@/lib/types";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ExternalLink,
  Globe2,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Empty } from "./empty";
import {
  companyColor,
  initials,
  LinkedInMark,
  Modal,
  timeAgo,
  View,
} from "./shared";

import type { Run, Source } from "@/lib/types";
import type { Dispatch, RefObject, SetStateAction } from "react";

interface Props {
  view: View;
  resultTotal: number;
  isOwner: boolean;
  sync: () => Promise<void>;
  busy: boolean;
  exportJobs: () => void;
  setTab: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  activeTab: string;
  savedCount: number;
  appliedCount: number;
  selectedRun: Run | undefined;
  contextJobs: Job[];
  collectedCount: number;
  filtered: Job[];
  relevantCount: number;
  unreviewedCount: number;
  archivedCount: number;
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  filters: boolean;
  setFilters: Dispatch<SetStateAction<boolean>>;
  region: string;
  sourceFilter: string;
  monitorFilter: string;
  sort: string;
  setSort: Dispatch<SetStateAction<string>>;
  setRegion: Dispatch<SetStateAction<string>>;
  setSourceFilter: Dispatch<SetStateAction<string>>;
  data: DashboardData;
  setMonitorFilter: Dispatch<SetStateAction<string>>;
  linkedInSearchUrl: string;
  linkedInMonitor: Monitor;
  paginatedJobs: Job[];
  openModal: (next: Exclude<Modal, null>) => void;
  now: number;
  changeStatus: (job: Job, status: JobStatus) => Promise<void>;
  jobs: Job[];
  navigate: (next: View, event?: React.MouseEvent<HTMLElement>) => void;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  currentPage: number;
  totalPages: number;
  jobsNextCursor: string | null;
  loadMoreJobs: () => Promise<void>;
  setError: Dispatch<SetStateAction<string>>;
  focusMonitor: (id: string) => void;
  liveSources: Source[];
}
export function JobsView({
  view,
  resultTotal,
  isOwner,
  sync,
  busy,
  exportJobs,
  setTab,
  setPage,
  activeTab,
  savedCount,
  appliedCount,
  selectedRun,
  contextJobs,
  collectedCount,
  filtered,
  relevantCount,
  unreviewedCount,
  archivedCount,
  searchRef,
  query,
  setQuery,
  filters,
  setFilters,
  region,
  sourceFilter,
  monitorFilter,
  sort,
  setSort,
  setRegion,
  setSourceFilter,
  data,
  setMonitorFilter,
  linkedInSearchUrl,
  linkedInMonitor,
  paginatedJobs,
  openModal,
  now,
  changeStatus,
  jobs,
  navigate,
  pageStart,
  pageEnd,
  pageSize,
  setPageSize,
  currentPage,
  totalPages,
  jobsNextCursor,
  loadMoreJobs,
  setError,
  focusMonitor,
  liveSources,
}: Props) {
  return (
    <div className={`content-grid ${view !== "overview" ? "wide" : ""}`}>
      <section className="opportunities">
        <div className="section-heading">
          <div>
            <h2>
              {view === "saved" ? "Your shortlist" : "Latest opportunities"}
              <span className="count-pill">{resultTotal}</span>
            </h2>
            <p>
              {view === "saved"
                ? "Keep track of the roles you want to come back to."
                : "Collected jobs with source, date, and monitor match context."}
            </p>
          </div>
          <div className="heading-actions">
            {isOwner && (
              <button
                className="icon-btn"
                aria-label="Refresh sources"
                onClick={sync}
                disabled={busy}
              >
                <RefreshCw size={17} className={busy ? "spin" : ""} />
              </button>
            )}
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
              : isOwner
                ? [
                    ["matched", "Relevant"],
                    ["all", "All collected"],
                    ["new", "Unreviewed"],
                    ["archived", "Archived"],
                  ]
                : [
                    ["matched", "Relevant"],
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
                className={activeTab === key ? "active" : ""}
              >
                {key === "matched" && <Sparkles size={13} />} {label}
                {key === "all" && (
                  <span>
                    {view === "saved"
                      ? savedCount + appliedCount
                      : selectedRun
                        ? contextJobs.length
                        : collectedCount}
                  </span>
                )}
                {key === "matched" && (
                  <span>{selectedRun ? filtered.length : relevantCount}</span>
                )}
                {key === "new" && <span>{unreviewedCount}</span>}
                {key === "archived" && <span>{archivedCount}</span>}
                {key === "applied" && <span>{appliedCount}</span>}
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
              <strong>{resultTotal}</strong> opportunities{" "}
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
                <div className={`company-avatar ${companyColor(job.company)}`}>
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
                    {now - new Date(job.firstSeenAt).getTime() < 86400000 && (
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
                      fill={job.status === "saved" ? "currentColor" : "none"}
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
          {resultTotal === 0 && (
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
          {resultTotal > 0 && (
            <div className="list-footer pagination-footer">
              <span>
                Showing {pageStart}-{pageEnd} of {resultTotal}
              </span>
              <div
                className="pagination-controls"
                aria-label="Opportunity pagination"
              >
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
                  onClick={() => {
                    if (
                      (currentPage + 1) * pageSize > filtered.length &&
                      jobsNextCursor
                    )
                      void loadMoreJobs().catch((cause) =>
                        setError(cause.message),
                      );
                    else setPage((value) => Math.min(totalPages, value + 1));
                  }}
                  disabled={currentPage === totalPages && !jobsNextCursor}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="data-note">
          <ShieldCheck size={13} />
          Always check availability and location eligibility on the original
          listing.
          {data.mode === "live" &&
            ` ${jobsNextCursor ? "Load more as you browse." : "All matching records are loaded."}`}
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
                  {jobs.filter((j) => j.matchedMonitors.includes(m.id)).length}
                </span>
              </button>
            ))}
            <button className="rail-link" onClick={() => navigate("monitors")}>
              Manage monitors <ArrowRight size={14} />
            </button>
          </section>
          <section className="rail-section">
            <div className="rail-heading">
              <h3>On your radar</h3>
              <span className="subtle-pill">{liveSources.length} sources</span>
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
            <button className="rail-link" onClick={() => navigate("sources")}>
              View all sources <ArrowRight size={14} />
            </button>
          </section>
          <section className="tip-card">
            <span className="tip-label">
              <Sparkles size={14} />
              CV SIGNAL
            </span>
            <h3>Prioritize stack fit.</h3>
            <p>
              These monitors include TypeScript, React, Next.js, Node, Laravel,
              PostgreSQL, Docker, AWS, and API work.
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
  );
}

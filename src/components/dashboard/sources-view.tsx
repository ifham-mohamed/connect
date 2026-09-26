"use client";
import {
  type LinkedInDatePosted,
  type LinkedInDistance,
  type LinkedInExperience,
  type LinkedInJobType,
  type LinkedInSort,
  type LinkedInWorkplace,
} from "@/lib/linkedin";
import type { DashboardData, Monitor } from "@/lib/types";
import {
  Activity,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Empty } from "./empty";
import { kindNames, LinkedInMark, Modal, timeAgo } from "./shared";

import type { Source } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";

interface Props {
  isOwner: boolean;
  linkedInMonitor: Monitor;
  setMonitorFilter: Dispatch<SetStateAction<string>>;
  data: DashboardData;
  linkedInQuery: string;
  setLinkedInQuery: Dispatch<SetStateAction<string>>;
  linkedInLocation: string;
  setLinkedInLocation: Dispatch<SetStateAction<string>>;
  linkedInWorkplace: LinkedInWorkplace;
  setLinkedInWorkplace: Dispatch<SetStateAction<LinkedInWorkplace>>;
  linkedInExperience: LinkedInExperience;
  setLinkedInExperience: Dispatch<SetStateAction<LinkedInExperience>>;
  linkedInJobType: LinkedInJobType;
  setLinkedInJobType: Dispatch<SetStateAction<LinkedInJobType>>;
  linkedInDatePosted: LinkedInDatePosted;
  setLinkedInDatePosted: Dispatch<SetStateAction<LinkedInDatePosted>>;
  linkedInSort: LinkedInSort;
  setLinkedInSort: Dispatch<SetStateAction<LinkedInSort>>;
  linkedInDistance: LinkedInDistance;
  setLinkedInDistance: Dispatch<SetStateAction<LinkedInDistance>>;
  linkedInEasyApply: boolean;
  setLinkedInEasyApply: Dispatch<SetStateAction<boolean>>;
  linkedInUnderTen: boolean;
  setLinkedInUnderTen: Dispatch<SetStateAction<boolean>>;
  linkedInSearchUrl: string;
  linkedInNetworkSearchUrl: string;
  linkedInPostSearchUrls: {
    sriLanka: string;
    qatarNetwork: string;
    global: string;
  };
  setWorkspaceFilter: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  workspaceFilter: string;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  sync: () => Promise<void>;
  busy: boolean;
  openModal: (next: Exclude<Modal, null>) => void;
  filteredSources: Source[];
  liveSources: Source[];
  paginatedSources: Source[];
  action: (
    actionName: string,
    id?: string,
    value?: unknown,
  ) => Promise<unknown>;
  setToast: Dispatch<SetStateAction<string>>;
  sourcePage: number;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
}
export function SourcesView({
  isOwner,
  linkedInMonitor,
  setMonitorFilter,
  data,
  linkedInQuery,
  setLinkedInQuery,
  linkedInLocation,
  setLinkedInLocation,
  linkedInWorkplace,
  setLinkedInWorkplace,
  linkedInExperience,
  setLinkedInExperience,
  linkedInJobType,
  setLinkedInJobType,
  linkedInDatePosted,
  setLinkedInDatePosted,
  linkedInSort,
  setLinkedInSort,
  linkedInDistance,
  setLinkedInDistance,
  linkedInEasyApply,
  setLinkedInEasyApply,
  linkedInUnderTen,
  setLinkedInUnderTen,
  linkedInSearchUrl,
  linkedInNetworkSearchUrl,
  linkedInPostSearchUrls,
  setWorkspaceFilter,
  setPage,
  workspaceFilter,
  query,
  setQuery,
  sync,
  busy,
  openModal,
  filteredSources,
  liveSources,
  paginatedSources,
  action,
  setToast,
  sourcePage,
  pageSize,
  setPageSize,
}: Props) {
  return (
    <section className="operations-panel">
      <div className="sources-intro">
        <ShieldCheck size={20} />
        <p>
          {isOwner
            ? "Manage the public APIs, feeds, and employer boards used by the workspace. Every opportunity keeps its original publisher link."
            : "View the feeds and employer boards maintained by the workspace owner. Every opportunity keeps its original publisher link."}
        </p>
      </div>
      <div className="linkedin-discovery-panel">
        <span className="linkedin-discovery-icon" aria-hidden="true">
          <LinkedInMark />
        </span>
        <div className="linkedin-discovery-copy">
          <strong>LinkedIn Jobs discovery</strong>
          <p>
            Start with a monitor, then refine the position, location, work
            arrangement, experience, job type, and posting date.
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
              <option value="entry">Entry / associate</option>
              <option value="mid">Mid level</option>
              <option value="senior">Senior level</option>
              <option value="other">Other / unspecified</option>
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
                onChange={(event) => setLinkedInEasyApply(event.target.checked)}
              />
              <span>Easy Apply</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={linkedInUnderTen}
                onChange={(event) => setLinkedInUnderTen(event.target.checked)}
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
          <div
            className="linkedin-search-paths"
            aria-label="LinkedIn discovery searches"
          >
            <a
              className="linkedin-path-link"
              href={linkedInNetworkSearchUrl}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Globe2 size={15} /> Jobs in my network
              </span>
              <ExternalLink size={13} />
            </a>
            <p>LinkedIn ranks this job search using your signed-in network.</p>
          </div>
          <section
            className="linkedin-post-discovery"
            aria-labelledby="linkedin-post-search-title"
          >
            <div className="linkedin-post-heading">
              <span aria-hidden="true">
                <Activity size={17} />
              </span>
              <div>
                <strong id="linkedin-post-search-title">
                  LinkedIn Post Search
                </strong>
                <p>
                  Find member posts mentioning hiring, vacancies, opportunities,
                  and job openings. These open Posts results, not job listings.
                </p>
              </div>
            </div>
            <div className="linkedin-post-options">
              <a
                href={linkedInPostSearchUrls.sriLanka}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>Sri Lanka posts</strong>
                  <small>
                    Colombo, Western Province, and Sri Lanka signals
                  </small>
                </span>
                <ExternalLink size={14} />
              </a>
              <a
                href={linkedInPostSearchUrls.qatarNetwork}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>Qatar network posts</strong>
                  <small>
                    Qatar and Doha posts from first-degree connections
                  </small>
                </span>
                <ExternalLink size={14} />
              </a>
              <a
                href={linkedInPostSearchUrls.global}
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>Global posts</strong>
                  <small>Remote, worldwide, and global hiring signals</small>
                </span>
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="linkedin-post-note">
              LinkedIn may further personalize results. Use its Posted by and
              Content type filters after opening a search when available.
            </p>
          </section>
        </div>
      </div>
      <div className="jobs-panel admin-table-panel">
        <div className="view-filters" aria-label="Source filters">
          {[
            ["all", "All sources", data.sources.length],
            [
              "connected",
              "Connected",
              data.sources.filter((s) => s.enabled && !s.lastError).length,
            ],
            ["paused", "Paused", data.sources.filter((s) => !s.enabled).length],
            [
              "error",
              "Needs attention",
              data.sources.filter((s) => s.lastError).length,
            ],
          ].map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => {
                setWorkspaceFilter(String(key));
                setPage(1);
              }}
              className={workspaceFilter === key ? "active" : ""}
            >
              {label}
              <span>{count}</span>
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
              <button
                className="icon-btn"
                aria-label="Clear source search"
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
          {isOwner && (
            <div className="toolbar-actions source-toolbar-actions">
              <button className="btn filter-btn" onClick={sync} disabled={busy}>
                <RefreshCw size={15} className={busy ? "spin" : ""} />
                <span>Check sources</span>
              </button>
              <button
                className="btn filter-btn"
                onClick={() => openModal({ type: "source" })}
              >
                <Plus size={16} />
                <span>Connect source</span>
              </button>
            </div>
          )}
        </div>
        <div className="results-row">
          <span>
            <strong>{filteredSources.length}</strong> sources{" "}
            <span className="muted">in this view</span>
          </span>
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
                        <span className={`source-avatar ${source.kind}`}>
                          {source.kind === "itpro" ? "it" : source.name[0]}
                        </span>
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
                        onClick={
                          isOwner
                            ? () =>
                                action(
                                  "source-toggle",
                                  source.id,
                                  !source.enabled,
                                ).catch((e) => setToast(e.message))
                            : undefined
                        }
                        disabled={!isOwner}
                        title={
                          isOwner
                            ? "Change source status"
                            : "Only the workspace owner can change sources"
                        }
                      >
                        <i
                          className={`status-dot ${source.lastError ? "failed" : !source.enabled ? "paused" : ""}`}
                        />
                        {!source.enabled
                          ? "Paused"
                          : source.lastError
                            ? "Needs attention"
                            : "Connected"}
                      </button>
                      {source.lastError && (
                        <small className="inline-error">
                          {source.lastError}
                        </small>
                      )}
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
            description={
              isOwner
                ? "Clear the search or connect a new Sri Lanka or remote job source."
                : "Clear the search to review the sources maintained by your workspace owner."
            }
            action={() => {
              setQuery("");
              setWorkspaceFilter("all");
              setPage(1);
            }}
            label="Clear filters"
          />
        )}
        {filteredSources.length > 0 && (
          <div className="list-footer pagination-footer">
            <span>
              Showing {(sourcePage - 1) * pageSize + 1}-
              {Math.min(sourcePage * pageSize, filteredSources.length)} of{" "}
              {filteredSources.length}
            </span>
            <div className="pagination-controls" aria-label="Source pagination">
              <label className="page-size-control">
                <span>Rows</span>
                <select
                  aria-label="Source rows per page"
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
                disabled={sourcePage === 1}
              >
                Previous
              </button>
              <span className="page-indicator">
                Page {sourcePage} of{" "}
                {Math.max(1, Math.ceil(filteredSources.length / pageSize))}
              </span>
              <button
                className="btn small pagination-btn"
                onClick={() =>
                  setPage((value) =>
                    Math.min(
                      Math.max(1, Math.ceil(filteredSources.length / pageSize)),
                      value + 1,
                    ),
                  )
                }
                disabled={
                  sourcePage ===
                  Math.max(1, Math.ceil(filteredSources.length / pageSize))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="info-panel compact-info">
        <h3>A note about coverage</h3>
        <p>
          Sri Lankan tech sources and remote sources stay connected as separate
          feeds, with original publisher links preserved for every collected
          job.
        </p>
      </div>
    </section>
  );
}

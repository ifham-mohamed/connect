"use client";
import type { Job } from "@/lib/types";
import { linkedInJobsSearchUrl } from "@/lib/linkedin";
import type { DashboardData, Monitor } from "@/lib/types";
import { ArrowRight, Plus, Radio, Search, Settings2, X } from "lucide-react";
import { Empty } from "./empty";
import { LinkedInMark, Modal } from "./shared";

import type { Dispatch, SetStateAction } from "react";

interface Props {
  filteredMonitors: Monitor[];
  data: DashboardData;
  setWorkspaceFilter: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  workspaceFilter: string;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  openModal: (next: Exclude<Modal, null>) => void;
  paginatedMonitors: Monitor[];
  jobs: Job[];
  focusMonitor: (id: string) => void;
  action: (
    actionName: string,
    id?: string,
    value?: unknown,
  ) => Promise<unknown>;
  setToast: Dispatch<SetStateAction<string>>;
  monitorPage: number;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
}
export function MonitorsView({
  filteredMonitors,
  data,
  setWorkspaceFilter,
  setPage,
  workspaceFilter,
  query,
  setQuery,
  openModal,
  paginatedMonitors,
  jobs,
  focusMonitor,
  action,
  setToast,
  monitorPage,
  pageSize,
  setPageSize,
}: Props) {
  return (
    <section className="operations-panel">
      <div className="section-heading">
        <div>
          <h2>
            Your monitors{" "}
            <span className="count-pill">{filteredMonitors.length}</span>
          </h2>
          <p>
            Search, filter, edit, and review matching jobs for every CV-aligned
            monitor.
          </p>
        </div>
      </div>
      <div className="jobs-panel admin-table-panel">
        <div className="view-filters" aria-label="Monitor filters">
          {[
            ["all", "All monitors", data.monitors.length],
            [
              "enabled",
              "Active",
              data.monitors.filter((m) => m.enabled).length,
            ],
            [
              "paused",
              "Paused",
              data.monitors.filter((m) => !m.enabled).length,
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
          <button
            className="btn filter-btn"
            onClick={() => openModal({ type: "monitor" })}
          >
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
                  const matchCount = jobs.filter((j) =>
                    j.matchedMonitors.includes(m.id),
                  ).length;
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
                              <small>
                                Excluding{" "}
                                {m.excludedKeywords.slice(0, 3).join(", ")}
                              </small>
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
                            <span className="chip-more">
                              +{m.keywords.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {m.location || "Any location"}
                        <small>
                          {(
                            m.workModes ||
                            (m.remoteOnly
                              ? ["remote"]
                              : ["onsite", "hybrid", "remote"])
                          )
                            .map((mode) =>
                              mode === "onsite"
                                ? "On-site"
                                : mode[0].toUpperCase() + mode.slice(1),
                            )
                            .join(" · ")}
                        </small>
                      </td>
                      <td>
                        <button
                          className="text-btn"
                          onClick={() => focusMonitor(m.id)}
                        >
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
                            onClick={() =>
                              openModal({ type: "monitor", monitor: m })
                            }
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
              Showing {(monitorPage - 1) * pageSize + 1}-
              {Math.min(monitorPage * pageSize, filteredMonitors.length)} of{" "}
              {filteredMonitors.length}
            </span>
            <div
              className="pagination-controls"
              aria-label="Monitor pagination"
            >
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
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn small pagination-btn"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={monitorPage === 1}
              >
                Previous
              </button>
              <span className="page-indicator">
                Page {monitorPage} of{" "}
                {Math.max(1, Math.ceil(filteredMonitors.length / pageSize))}
              </span>
              <button
                className="btn small pagination-btn"
                onClick={() =>
                  setPage((value) =>
                    Math.min(
                      Math.max(
                        1,
                        Math.ceil(filteredMonitors.length / pageSize),
                      ),
                      value + 1,
                    ),
                  )
                }
                disabled={
                  monitorPage ===
                  Math.max(1, Math.ceil(filteredMonitors.length / pageSize))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

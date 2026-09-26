"use client";
import type { DashboardData } from "@/lib/types";
import {
  Activity,
  ArrowRight,
  Check,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Empty } from "./empty";
import { dateTime } from "./shared";

import type { Run } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";

interface Props {
  data: DashboardData;
  setWorkspaceFilter: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  workspaceFilter: string;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  isOwner: boolean;
  sync: () => Promise<void>;
  busy: boolean;
  filteredRuns: Run[];
  paginatedRuns: Run[];
  viewRun: (runId: string, scope?: "all" | "new") => Promise<void>;
  runPage: number;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
}
export function ActivityView({
  data,
  setWorkspaceFilter,
  setPage,
  workspaceFilter,
  query,
  setQuery,
  isOwner,
  sync,
  busy,
  filteredRuns,
  paginatedRuns,
  viewRun,
  runPage,
  pageSize,
  setPageSize,
}: Props) {
  return (
    <section className="operations-panel">
      <div className="jobs-panel admin-table-panel">
        <div className="view-filters" aria-label="Activity filters">
          {[
            ["all", "All checks", data.runs.length],
            [
              "success",
              "Success",
              data.runs.filter((r) => r.status === "success").length,
            ],
            [
              "failed",
              "Failed",
              data.runs.filter((r) => r.status === "failed").length,
            ],
            [
              "running",
              "Running",
              data.runs.filter((r) => r.status === "running").length,
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
              aria-label="Search activity"
              placeholder="Search source names, statuses, or errors…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            {query ? (
              <button
                className="icon-btn"
                aria-label="Clear activity search"
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
            <button className="btn filter-btn" onClick={sync} disabled={busy}>
              <RefreshCw size={15} className={busy ? "spin" : ""} />
              <span>Check sources</span>
            </button>
          )}
        </div>
        <div className="results-row">
          <span>
            <strong>{filteredRuns.length}</strong> source checks{" "}
            <span className="muted">in this view</span>
          </span>
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
                  <th>Results</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong>{run.sourceName}</strong>
                      {run.error && (
                        <small className="inline-error">{run.error}</small>
                      )}
                    </td>
                    <td>{dateTime(run.startedAt)}</td>
                    <td>
                      <span className={`run-status ${run.status}`}>
                        {run.status === "success" ? (
                          <Check size={12} />
                        ) : run.status === "failed" ? (
                          <X size={12} />
                        ) : (
                          <Activity size={12} />
                        )}{" "}
                        {run.status}
                      </span>
                    </td>
                    <td>{run.fetched}</td>
                    <td>+{run.added}</td>
                    <td>
                      <div className="run-result-actions">
                        <button
                          className="btn small"
                          disabled={run.fetched === 0}
                          onClick={() => void viewRun(run.id)}
                        >
                          View run <ArrowRight size={13} />
                        </button>
                        {run.added > 0 && (
                          <button
                            className="btn small subtle"
                            onClick={() => void viewRun(run.id, "new")}
                          >
                            New only
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Activity size={25} />}
            title="No source checks match that view."
            description={
              isOwner
                ? "Clear the search or run a fresh source check."
                : "Clear the search to review recent collection activity."
            }
            action={() => {
              setQuery("");
              setWorkspaceFilter("all");
              setPage(1);
            }}
            label="Clear filters"
          />
        )}
        {filteredRuns.length > 0 && (
          <div className="list-footer pagination-footer">
            <span>
              Showing {(runPage - 1) * pageSize + 1}-
              {Math.min(runPage * pageSize, filteredRuns.length)} of{" "}
              {filteredRuns.length}
            </span>
            <div
              className="pagination-controls"
              aria-label="Activity pagination"
            >
              <label className="page-size-control">
                <span>Rows</span>
                <select
                  aria-label="Activity rows per page"
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
                disabled={runPage === 1}
              >
                Previous
              </button>
              <span className="page-indicator">
                Page {runPage} of{" "}
                {Math.max(1, Math.ceil(filteredRuns.length / pageSize))}
              </span>
              <button
                className="btn small pagination-btn"
                onClick={() =>
                  setPage((value) =>
                    Math.min(
                      Math.max(1, Math.ceil(filteredRuns.length / pageSize)),
                      value + 1,
                    ),
                  )
                }
                disabled={
                  runPage ===
                  Math.max(1, Math.ceil(filteredRuns.length / pageSize))
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

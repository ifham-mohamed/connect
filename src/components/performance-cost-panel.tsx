"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Gauge, LoaderCircle } from "lucide-react";

type Performance = {
  database: { bytes: string; jobs: number; runRows: number };
  queue: {
    pending: number;
    processing: number;
    failed: number;
    oldestPendingSeconds: number;
  };
  sources: {
    runs: number;
    fetched: number;
    added: number;
    failed: number;
    notModified: number;
    changed: number;
  };
  budget: {
    requests: number;
    monthlyRequestLimit: number;
    available: boolean;
    pausedReason: string | null;
  };
};

export default function PerformanceCostPanel() {
  const [data, setData] = useState<Performance | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/performance", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Performance data is unavailable.");
        setData(result);
      })
      .catch((cause) => {
        if (cause.name !== "AbortError") setError(cause.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="settings-card ai-usage-card">
      <div className="settings-card-heading compact">
        <span className="settings-icon">
          <Gauge size={20} />
        </span>
        <span>
          <small>Owner overview</small>
          <h3>Performance and cost</h3>
        </span>
      </div>
      {!data ? (
        <span className="security-loading">
          <LoaderCircle className="spin" size={15} />{" "}
          {error || "Loading capacity…"}
        </span>
      ) : (
        <>
          <div className="ai-usage-summary">
            <article>
              <Database size={17} />
              <span>
                <strong>
                  {(Number(data.database.bytes) / 1024 / 1024).toFixed(1)} MB
                </strong>
                <small>
                  {data.database.jobs} jobs · {data.database.runRows} run rows
                </small>
              </span>
            </article>
            <article>
              <Activity size={17} />
              <span>
                <strong>{data.sources.runs}</strong>
                <small>
                  7 days · {data.sources.added} added ·{" "}
                  {data.sources.notModified} unchanged
                </small>
              </span>
            </article>
            <article>
              <Gauge size={17} />
              <span>
                <strong>
                  {data.budget.requests}/{data.budget.monthlyRequestLimit}
                </strong>
                <small>AI requests this month</small>
              </span>
            </article>
          </div>
          <p className="intelligence-message">
            Queue: {data.queue.pending} pending · {data.queue.processing}{" "}
            processing · {data.queue.failed} failed.
            {data.budget.pausedReason
              ? ` AI paused: ${data.budget.pausedReason}`
              : " Zero-spend AI boundary is healthy."}
          </p>
        </>
      )}
    </section>
  );
}

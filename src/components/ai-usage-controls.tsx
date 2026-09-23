"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type AiUsage = {
  unlimited: boolean;
  memberLimit: number;
  limit: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  resetAt: string;
};
type UsageResponse = {
  usage: AiUsage;
  memberSummary: {
    activeMembers: number;
    analyses: number;
    pending: number;
  };
  workspaceBudget: {
    backgroundEnabled: boolean;
    monthlyRequestLimit: number;
    monthlyTokenLimit: number;
    pausedReason: string | null;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    cacheHits: number;
    failures: number;
    avoidedRequests: number;
    available: boolean;
  } | null;
};

export default function AiUsageControls() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [limit, setLimit] = useState(5);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [monthlyRequestLimit, setMonthlyRequestLimit] = useState(500);
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(1_000_000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/ai-usage", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "AI usage could not be loaded.");
    setData(result);
    setLimit(result.usage.memberLimit);
    if (result.workspaceBudget) {
      setBackgroundEnabled(result.workspaceBudget.backgroundEnabled);
      setMonthlyRequestLimit(result.workspaceBudget.monthlyRequestLimit);
      setMonthlyTokenLimit(result.workspaceBudget.monthlyTokenLimit);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((cause) => setMessage(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai-usage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberDailyJobAnalysisLimit: limit,
          backgroundEnabled,
          monthlyRequestLimit,
          monthlyTokenLimit,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The daily limit could not be saved.");
      await load();
      setMessage("Member AI allowance updated.");
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card ai-usage-card">
      <div className="settings-card-heading compact">
        <span className="settings-icon">
          <Sparkles size={20} />
        </span>
        <span>
          <small>Owner control</small>
          <h3>AI analysis allowance</h3>
        </span>
        <em className="ai-owner-unlimited">
          <ShieldCheck size={13} /> No owner daily cap
        </em>
      </div>
      <p>
        Set how many new CV-to-job analyses each member can run per Sri Lanka
        calendar day. Saved results and cached reviews do not use allowance.
      </p>
      {!data ? (
        <span className="security-loading">
          <LoaderCircle className="spin" size={15} /> Loading usage policy…
        </span>
      ) : (
        <>
          <div className="ai-usage-summary">
            <article>
              <BarChart3 size={17} />
              <span>
                <strong>{data.memberSummary.analyses}</strong>
                <small>member analyses today</small>
              </span>
            </article>
            <article>
              <span>
                <strong>{data.memberSummary.activeMembers}</strong>
                <small>members active today</small>
              </span>
            </article>
            <article>
              <span>
                <strong>{data.memberSummary.pending}</strong>
                <small>analyses in progress</small>
              </span>
            </article>
          </div>
          <div className="ai-policy-form">
            <label className="settings-field">
              <span>Daily analyses per member</span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={limit}
                onChange={(event) =>
                  setLimit(
                    Math.min(100, Math.max(1, Number(event.target.value))),
                  )
                }
              />
            </label>
            <label className="settings-field">
              <span>Monthly AI requests</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={monthlyRequestLimit}
                onChange={(event) =>
                  setMonthlyRequestLimit(
                    Math.max(1, Number(event.target.value)),
                  )
                }
              />
            </label>
            <label className="settings-field">
              <span>Monthly tokens</span>
              <input
                type="number"
                min={1000}
                max={100000000}
                value={monthlyTokenLimit}
                onChange={(event) =>
                  setMonthlyTokenLimit(
                    Math.max(1000, Number(event.target.value)),
                  )
                }
              />
            </label>
            <label className="settings-check">
              <input
                type="checkbox"
                checked={backgroundEnabled}
                onChange={(event) => setBackgroundEnabled(event.target.checked)}
              />
              <span>Allow background JEV classification within this cap</span>
            </label>
            <button className="btn primary" disabled={busy} onClick={save}>
              {busy ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Check size={14} />
              )}
              Save allowance
            </button>
          </div>
          {data.workspaceBudget && (
            <p className="intelligence-message" role="status">
              This month: {data.workspaceBudget.requests} requests ·{" "}
              {(
                data.workspaceBudget.inputTokens +
                data.workspaceBudget.outputTokens
              ).toLocaleString()}{" "}
              tokens · {data.workspaceBudget.cacheHits} cached ·{" "}
              {data.workspaceBudget.avoidedRequests} avoided.
              {data.workspaceBudget.pausedReason
                ? ` Paused: ${data.workspaceBudget.pausedReason}`
                : " Zero-spend guard is active."}
            </p>
          )}
        </>
      )}
      {message && (
        <p className="intelligence-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

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
};

export default function AiUsageControls() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [limit, setLimit] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/ai-usage", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "AI usage could not be loaded.");
    setData(result);
    setLimit(result.usage.memberLimit);
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
        body: JSON.stringify({ memberDailyJobAnalysisLimit: limit }),
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
          <ShieldCheck size={13} /> Owner unlimited
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
            <button className="btn primary" disabled={busy} onClick={save}>
              {busy ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Check size={14} />
              )}
              Save allowance
            </button>
          </div>
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

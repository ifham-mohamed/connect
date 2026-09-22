"use client";

import { useCallback, useEffect, useState } from "react";

type Rule = {
  sourceKind: string;
  field: string;
  minConfidence: number;
  enabled: boolean;
  rationale: string;
};
type Correction = {
  id: string;
  jobId: string;
  title: string;
  field: string;
  value: string;
  reason: string;
};
type Health = {
  mode: string;
  queue: { status: string; count: number }[];
  evaluations: { total: number; review: number };
  rules: Rule[];
  corrections: Correction[];
};
const fields = [
  "content_quality",
  "technology_relevance",
  "work_arrangement",
  "career_stage",
] as const;
const choices: Record<string, string[]> = {
  content_quality: ["usable", "sparse", "malformed", "non_job"],
  technology_relevance: ["technology", "non_technology"],
  work_arrangement: ["onsite", "hybrid", "remote", "unclear"],
  career_stage: ["internship", "entry", "mid", "senior", "other"],
};

export default function IntelligenceControls({
  sources,
}: {
  sources: { kind: string; name: string }[];
}) {
  const [health, setHealth] = useState<Health | null>(null);
  const [message, setMessage] = useState("");
  const [sourceKind, setSourceKind] = useState(sources[0]?.kind || "itpro");
  const [field, setField] = useState<string>("content_quality");
  const [confidence, setConfidence] = useState(0.9);
  const [rationale, setRationale] = useState("");
  const [jobId, setJobId] = useState("");
  const [correctionField, setCorrectionField] = useState("career_stage");
  const [correctionValue, setCorrectionValue] = useState("entry");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/intelligence", { cache: "no-store" });
    if (!response.ok) throw new Error("JEV controls could not be loaded.");
    setHealth(await response.json());
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((error) => setMessage(error.message));
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const current = health?.rules.find(
    (rule) => rule.sourceKind === sourceKind && rule.field === field,
  );
  async function submit(body: object) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The change could not be saved.");
      await load();
      setMessage("Saved. The change and its reason are recorded.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card intelligence-controls">
      <div className="settings-card-heading compact">
        <span>
          <small>Owner controls</small>
          <h3>JEV review and rollout</h3>
        </span>
      </div>
      <p>
        Current mode: <strong>{health?.mode || "Loading"}</strong>. Assisted
        matching uses a field only after its source rule is enabled. Explicit
        career levels and work arrangements stay protected.
      </p>
      {health && (
        <div className="setting-row">
          <span>Evaluated / review</span>
          <strong>
            {health.evaluations.total} / {health.evaluations.review}
          </strong>
        </div>
      )}
      {health && (
        <div className="setting-row">
          <span>Queue</span>
          <strong>
            {health.queue
              .map((item) => `${item.status}: ${item.count}`)
              .join(" · ") || "Empty"}
          </strong>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit({
            action: "rule-save",
            sourceKind,
            field,
            minConfidence: confidence,
            enabled: true,
            rationale,
          });
        }}
      >
        <h4>Enable a reviewed field</h4>
        <div className="intelligence-form-grid">
          <label className="settings-field">
            <span>Source</span>
            <select
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value)}
            >
              {Array.from(
                new Map(sources.map((item) => [item.kind, item])).values(),
              ).map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>Question field</span>
            <select
              value={field}
              onChange={(event) => setField(event.target.value)}
            >
              {fields.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>Minimum confidence</span>
            <input
              type="number"
              min="0.5"
              max="1"
              step="0.01"
              value={confidence}
              onChange={(event) => setConfidence(Number(event.target.value))}
            />
          </label>
        </div>
        <label className="settings-field">
          <span>Review evidence and reason</span>
          <textarea
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
            minLength={20}
            maxLength={1000}
            rows={2}
            required
            placeholder="Summarize the reviewed source sample and decision."
          />
        </label>
        <div className="settings-actions">
          <button
            className="btn primary"
            disabled={busy || rationale.trim().length < 20}
          >
            Enable field
          </button>
          {current?.enabled && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                void submit({
                  action: "rule-save",
                  sourceKind,
                  field,
                  minConfidence: current.minConfidence,
                  enabled: false,
                  rationale: current.rationale,
                })
              }
            >
              Disable field
            </button>
          )}
        </div>
        <p>
          Selected rule:{" "}
          {current?.enabled
            ? `Enabled at ${current.minConfidence}`
            : "Deterministic only"}
          .
        </p>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit({
            action: "correction-add",
            jobId,
            field: correctionField,
            value: correctionValue,
            reason,
          });
        }}
      >
        <h4>Correct a reviewed listing</h4>
        <label className="settings-field">
          <span>Job ID</span>
          <input
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            required
            placeholder="Job ID from the opportunity URL"
          />
        </label>
        <div className="intelligence-form-grid">
          <label className="settings-field">
            <span>Field</span>
            <select
              value={correctionField}
              onChange={(event) => {
                const next = event.target.value;
                setCorrectionField(next);
                setCorrectionValue(choices[next][0]);
              }}
            >
              {fields.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-field">
            <span>Correct value</span>
            <select
              value={correctionValue}
              onChange={(event) => setCorrectionValue(event.target.value)}
            >
              {choices[correctionField].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="settings-field">
          <span>Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={8}
            maxLength={500}
            rows={2}
            required
            placeholder="Describe the source evidence."
          />
        </label>
        <button className="btn" disabled={busy || reason.trim().length < 8}>
          Record correction
        </button>
      </form>
      {!!health?.corrections.length && (
        <div>
          <h4>Recent corrections</h4>
          <ul className="intelligence-corrections">
            {health.corrections.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.title}: {item.field.replaceAll("_", " ")} → {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Settings2,
} from "lucide-react";

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
type ReviewJob = {
  jobId: string;
  title: string;
  company: string;
  source: string;
  overallScore: string | null;
};
type Health = {
  mode: string;
  queue: { status: string; count: number }[];
  evaluations: { total: number; review: number };
  rules: Rule[];
  corrections: Correction[];
  reviewedJobs: ReviewJob[];
  pendingJobs: ReviewJob[];
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
    if (!response.ok)
      throw new Error("Intelligence workspace could not be loaded.");
    setHealth(await response.json());
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((error) => setMessage(error.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);
  const current = health?.rules.find(
    (rule) => rule.sourceKind === sourceKind && rule.field === field,
  );
  const pendingCount = useMemo(
    () =>
      health?.queue
        .filter((item) =>
          ["pending", "retrying", "processing"].includes(item.status),
        )
        .reduce((sum, item) => sum + item.count, 0) || 0,
    [health],
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
      setMessage("Saved. The decision and its reason are recorded.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="intelligence-controls">
      <div className="intelligence-hero">
        <span>
          <BrainCircuit size={24} />
        </span>
        <div>
          <small>CAREER INTELLIGENCE</small>
          <h2>Understand each match before you apply.</h2>
          <p>
            JEV structures job listings. Your private CV review separately
            compares saved evidence with a role, so every result remains
            explainable.
          </p>
        </div>
        <em>{health ? `${health.mode} mode` : "Preparing data"}</em>
      </div>
      <div className="intelligence-stats">
        <article>
          <CheckCircle2 size={17} />
          <span>
            <strong>
              {health ? (
                health.reviewedJobs.length
              ) : (
                <span className="intelligence-value-skeleton" />
              )}
            </strong>
            <small>personal reviews</small>
          </span>
        </article>
        <article>
          <Clock3 size={17} />
          <span>
            <strong>
              {health ? (
                health.pendingJobs.length
              ) : (
                <span className="intelligence-value-skeleton" />
              )}
            </strong>
            <small>matches ready to review</small>
          </span>
        </article>
        <article>
          <Gauge size={17} />
          <span>
            <strong>
              {health ? (
                health.evaluations.total
              ) : (
                <span className="intelligence-value-skeleton" />
              )}
            </strong>
            <small>listings classified</small>
          </span>
        </article>
        <article>
          <BrainCircuit size={17} />
          <span>
            <strong>
              {health ? (
                pendingCount
              ) : (
                <span className="intelligence-value-skeleton" />
              )}
            </strong>
            <small>classification queue</small>
          </span>
        </article>
      </div>
      <div className="intelligence-review-layout">
        <JobList
          title="Your saved CV comparisons"
          eyebrow="ANALYZED JOBS"
          jobs={health?.reviewedJobs || []}
          reviewed
          loading={!health}
        />
        <JobList
          title="Relevant jobs without a review"
          eyebrow="READY TO ANALYZE"
          jobs={health?.pendingJobs || []}
          loading={!health}
        />
      </div>
      <details className="intelligence-advanced">
        <summary>
          <span>
            <Settings2 size={17} />
            <strong>Advanced owner controls</strong>
            <small>Rollout rules and evidence corrections</small>
          </span>
          <span>Open controls</span>
        </summary>
        <div className="intelligence-advanced-body">
          <p>
            These controls govern when JEV classifications may assist platform
            matching. Deterministic career-level and work-arrangement rules
            remain protected.
          </p>
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
            <h4>Enable a reviewed classification</h4>
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
                <span>Classification</span>
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
                  onChange={(event) =>
                    setConfidence(Number(event.target.value))
                  }
                />
              </label>
            </div>
            <label className="settings-field">
              <span>Evidence and decision</span>
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
                Enable classification
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
                  Disable
                </button>
              )}
            </div>
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
            <h4>Correct a classified listing</h4>
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
                <span>Classification</span>
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
              <span>Evidence for correction</span>
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
                    {item.title}: {item.field.replaceAll("_", " ")} →{" "}
                    {item.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
      {message && (
        <p className="intelligence-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function JobList({
  title,
  eyebrow,
  jobs,
  reviewed = false,
  loading = false,
}: {
  title: string;
  eyebrow: string;
  jobs: ReviewJob[];
  reviewed?: boolean;
  loading?: boolean;
}) {
  return (
    <section className="intelligence-list-panel">
      <header>
        <div>
          <small>{eyebrow}</small>
          <h3>{title}</h3>
        </div>
        <span>
          {loading ? (
            <i className="intelligence-count-skeleton" />
          ) : (
            jobs.length
          )}
        </span>
      </header>
      <div className="intelligence-job-list">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <span className="intelligence-job-row skeleton-row" key={index}>
              <i />
              <span>
                <i />
                <i />
              </span>
            </span>
          ))
        ) : jobs.length ? (
          jobs.map((job) => (
            <Link
              href={`/app/jobs?job=${job.jobId}`}
              className="intelligence-job-row"
              key={job.jobId}
            >
              <span
                className={
                  reviewed
                    ? "intelligence-job-score"
                    : "intelligence-job-pending"
                }
              >
                {reviewed ? (
                  job.overallScore ? (
                    `${job.overallScore}%`
                  ) : (
                    "Refresh"
                  )
                ) : (
                  <Clock3 size={15} />
                )}
              </span>
              <span>
                <strong>{job.title}</strong>
                <small>
                  {job.company} · {job.source}
                </small>
              </span>
              <ArrowRight size={15} />
            </Link>
          ))
        ) : (
          <p className="intelligence-empty">
            {reviewed ? (
              <>
                Open an opportunity and choose <strong>Review with JEV</strong>{" "}
                to build your history.
              </>
            ) : (
              "Every current relevant match has a saved review."
            )}
          </p>
        )}
      </div>
    </section>
  );
}

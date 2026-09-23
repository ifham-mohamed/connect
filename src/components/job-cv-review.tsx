"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSearch,
  FileText,
  GraduationCap,
  Layers3,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { CvReviewResult } from "@/lib/intelligence/cv-review";

type SavedReview = {
  id: string;
  result: CvReviewResult;
  model: string;
  createdAt: string;
};
type AiUsage = {
  unlimited: boolean;
  memberLimit: number;
  limit: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  resetAt: string;
};
const labels = {
  role: "Role direction",
  careerLevel: "Career level",
  skills: "Skills",
  experience: "Experience",
} as const;
const verdicts = {
  supported: "Supported",
  partial: "Partly supported",
  not_shown: "Not demonstrated",
  unclear: "Needs review",
} as const;
const recommendations = {
  strong: "Strong evidence match",
  good: "Good evidence match",
  stretch: "Stretch opportunity",
  not_aligned: "Limited alignment",
  insufficient: "Insufficient listing detail",
} as const;
const analysisSteps = [
  "Mapping the role direction",
  "Calculating dated experience",
  "Comparing every skill",
  "Preparing the evidence review",
] as const;

function formatMonths(months: number) {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (!years) return `${remainder} month${remainder === 1 ? "" : "s"}`;
  return `${years} yr${years === 1 ? "" : "s"}${remainder ? ` ${remainder} mo` : ""}`;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function EvidenceList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p>{empty}</p>;
  return (
    <>
      <ul>
        <li>{items[0]}</li>
      </ul>
      {items.length > 1 && (
        <details className="job-review-more">
          <summary>
            Show {items.length - 1} more{" "}
            {items.length === 2 ? "excerpt" : "excerpts"}
          </summary>
          <ul>
            {items.slice(1).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export default function JobCvReview({ jobId }: { jobId: string }) {
  const [review, setReview] = useState<SavedReview | null>(null);
  const [cvAvailable, setCvAvailable] = useState<boolean | null>(null);
  const [reviewReady, setReviewReady] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loadRetry, setLoadRetry] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(`/api/jobs/${jobId}/cv-review`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Review could not be loaded.");
          if (!active) return;
          setCvAvailable(result.cvAvailable);
          setReview(result.review);
          setStale(result.stale);
          setUsage(result.usage || null);
          setReviewReady(result.reviewReady !== false);
          setBlockedReason(result.blockedReason || null);
          return;
        } catch (cause) {
          if (!active || controller.signal.aborted) return;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 450));
            continue;
          }
          setError((cause as Error).message);
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [jobId, loadRetry]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(
      () =>
        setAnalysisStep((current) =>
          Math.min(current + 1, analysisSteps.length - 1),
        ),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [busy]);

  async function analyze() {
    setAnalysisStep(0);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/cv-review`, {
        method: "POST",
      });
      const result = await response.json();
      if (result.usage) setUsage(result.usage);
      if (!response.ok)
        throw new Error(result.error || "Review could not be completed.");
      setReview(result.review);
      setStale(false);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const result = review?.result;
  const matched =
    result?.skills.items.filter((item) => item.status === "matched") || [];
  const related =
    result?.skills.items.filter((item) => item.status === "related") || [];
  const missing =
    result?.skills.items.filter((item) => item.status === "missing") || [];

  return (
    <section className="job-review-card" aria-label="CV match review">
      <div className="job-review-heading">
        <span className="job-review-mark">
          <Sparkles size={18} />
        </span>
        <div>
          <small>PERSONAL REVIEW</small>
          <h3>How this role fits your CV</h3>
        </div>
      </div>

      {cvAvailable === null && !error && (
        <div className="job-review-loading">
          <LoaderCircle size={15} className="spin" /> Checking your saved
          reviews…
        </div>
      )}
      {cvAvailable === false && (
        <div className="job-review-empty">
          <FileText size={21} />
          <p>
            {blockedReason === "CV_REVIEW_REQUIRED"
              ? "Review and save your extracted CV profile before comparing jobs."
              : "Save a reviewed CV to compare this opportunity with your experience."}
          </p>
          <Link href="/app/profile/cv" className="btn">
            Set up your CV <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {cvAvailable && !reviewReady && (
        <div className="job-review-empty job-review-extraction-needed">
          <FileSearch size={21} />
          <div>
            <strong>Listing text is needed first</strong>
            <p>
              This source publishes the vacancy as an image. Extract and approve
              its text locally for an accurate comparison.
            </p>
          </div>
          <a href="#listing-text-workspace" className="btn">
            Extract listing text <ArrowRight size={14} />
          </a>
        </div>
      )}
      {cvAvailable &&
        reviewReady &&
        !review &&
        (busy ? (
          <div className="job-review-analysis" role="status" aria-live="polite">
            <div className="job-review-analysis-visual" aria-hidden="true">
              <span className="analysis-orbit orbit-one" />
              <span className="analysis-orbit orbit-two" />
              <span className="analysis-core">
                <BrainCircuit size={24} />
              </span>
            </div>
            <div className="job-review-analysis-copy">
              <small>PRIVATE EVIDENCE COMPARISON</small>
              <strong>{analysisSteps[analysisStep]}</strong>
              <p>
                JEV is checking normalized role, tenure, and skill evidence
                without receiving your identity or CV file.
              </p>
              <div className="analysis-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${((analysisStep + 1) / analysisSteps.length) * 100}%`,
                  }}
                />
              </div>
              <div className="analysis-step-dots" aria-hidden="true">
                {analysisSteps.map((step, index) => (
                  <i
                    key={step}
                    className={index <= analysisStep ? "active" : ""}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="job-review-prompt">
            <p>
              {stale
                ? "Your CV, this listing, or the review rules changed. Run a fresh evidence comparison."
                : "Compare role direction, career level, dated experience, and every detected skill requirement."}
            </p>
            <button
              className="btn primary"
              disabled={usage?.remaining === 0}
              onClick={() => void analyze()}
            >
              <Sparkles size={15} /> Review with JEV
            </button>
            {usage && (
              <span className="job-review-allowance">
                <ShieldCheck size={13} />
                {usage.unlimited
                  ? "Owner access · unlimited analyses"
                  : `${usage.remaining} of ${usage.limit} analyses remaining today`}
              </span>
            )}
            <small>
              Only normalized evidence is shared. The percentage measures CV
              evidence coverage, not hiring probability.
            </small>
          </div>
        ))}

      {review && result && (
        <div className="job-review-result">
          <div className="job-review-summary">
            <span>
              <Check size={14} /> Saved review
            </span>
            <small>
              {new Date(review.createdAt).toLocaleDateString()} · {review.model}
            </small>
          </div>
          <div className="job-review-overview">
            <div
              className={`job-review-score${result.overallScore === null ? " score-empty" : ""}`}
              style={
                {
                  "--review-score": `${(result.overallScore || 0) * 3.6}deg`,
                } as React.CSSProperties
              }
              aria-label={
                result.overallScore === null
                  ? "Insufficient detail for a score"
                  : `${result.overallScore}% CV evidence match`
              }
            >
              <span>
                <strong>
                  {result.overallScore === null
                    ? "—"
                    : `${result.overallScore}%`}
                </strong>
                <small>match</small>
              </span>
            </div>
            <div className="job-review-overview-copy">
              <small>
                {result.analysisCompleteness}% ANALYSIS COMPLETENESS
              </small>
              <h4>{recommendations[result.recommendation]}</h4>
              <p>
                {result.overallScore === null
                  ? "The listing does not state enough evaluable detail for a responsible percentage."
                  : "Calculated from explicit role, level, skill, and dated experience evidence."}
              </p>
            </div>
            <div className="job-review-signal">
              <Target size={17} />
              <span>
                <strong>{matched.length} matched</strong>
                <small>
                  {missing.length} missing · {related.length} related
                </small>
              </span>
            </div>
          </div>

          <div className="job-review-facts">
            <article>
              <BriefcaseBusiness size={16} />
              <span>
                <small>ROLE DIRECTION</small>
                <strong>{titleCase(result.role.jobFamily)}</strong>
                <em className={`fit-${result.role.match}`}>
                  {titleCase(result.role.match)}
                </em>
              </span>
            </article>
            <article>
              <Layers3 size={16} />
              <span>
                <small>CAREER LEVEL</small>
                <strong>
                  {result.careerLevel.job === "other"
                    ? "Not stated"
                    : titleCase(result.careerLevel.job)}
                </strong>
                <em className={`fit-${result.careerLevel.assessment}`}>
                  {titleCase(result.careerLevel.assessment)}
                </em>
              </span>
            </article>
            <article>
              <Clock3 size={16} />
              <span>
                <small>RELEVANT EXPERIENCE</small>
                <strong>
                  {formatMonths(result.experience.relevantMonths)}
                </strong>
                <em className={`fit-${result.experience.assessment}`}>
                  {titleCase(result.experience.assessment)}
                </em>
              </span>
            </article>
            <article>
              <GraduationCap size={16} />
              <span>
                <small>QUALIFICATION</small>
                <strong>
                  {result.education.jobEvidence.length
                    ? "Requested"
                    : "Not stated"}
                </strong>
                <em className={`fit-${result.education.assessment}`}>
                  {titleCase(result.education.assessment)}
                </em>
              </span>
            </article>
          </div>

          <div className="job-review-insights">
            <article className="job-review-insight positive">
              <div>
                <CheckCircle2 size={16} />
                <strong>Evidence that connects</strong>
              </div>
              {result.strengths.length ? (
                <ul>
                  {result.strengths.slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No strong evidence connection was confirmed.</p>
              )}
            </article>
            <article className="job-review-insight caution">
              <div>
                <CircleAlert size={16} />
                <strong>Check before applying</strong>
              </div>
              {result.blockingGaps.length ? (
                <ul>
                  {result.blockingGaps.slice(0, 5).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No explicit blocking gap was detected in the available listing
                  text.
                </p>
              )}
            </article>
          </div>

          <details className="job-review-breakdown" open>
            <summary>
              <span>
                <Layers3 size={15} />
                <strong>Skills and technologies</strong>
              </span>
              <small>{result.skills.items.length} detected</small>
            </summary>
            <div className="job-review-skill-groups">
              {(["matched", "related", "missing"] as const).map((status) => {
                const items = result.skills.items.filter(
                  (item) => item.status === status,
                );
                if (!items.length) return null;
                return (
                  <section key={status}>
                    <h5>
                      {titleCase(status)} <span>{items.length}</span>
                    </h5>
                    <div>
                      {items.map((item) => (
                        <span
                          className={`skill-fit skill-${status}`}
                          title={item.jobEvidence[0]}
                          key={`${status}-${item.name}`}
                        >
                          {item.name}
                          <small>{item.importance}</small>
                        </span>
                      ))}
                    </div>
                  </section>
                );
              })}
              {result.skills.additionalCvSkills.length > 0 && (
                <details className="job-review-additional">
                  <summary>
                    {result.skills.additionalCvSkills.length} additional CV
                    strengths
                  </summary>
                  <div>
                    {result.skills.additionalCvSkills.map((item) => (
                      <span className="skill-fit" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </details>

          <details className="job-review-breakdown">
            <summary>
              <span>
                <Clock3 size={15} />
                <strong>Experience calculation</strong>
              </span>
              <small>{formatMonths(result.experience.totalMonths)} total</small>
            </summary>
            <div className="job-review-tenure-summary">
              <span>
                <small>Relevant</small>
                <strong>
                  {formatMonths(result.experience.relevantMonths)}
                </strong>
              </span>
              <span>
                <small>Professional total</small>
                <strong>{formatMonths(result.experience.totalMonths)}</strong>
              </span>
              <span>
                <small>Listing asks</small>
                <strong>
                  {result.experience.requirement
                    ? `${formatMonths(result.experience.requirement.minMonths)}${result.experience.requirement.maxMonths === null ? "+" : result.experience.requirement.maxMonths !== result.experience.requirement.minMonths ? `–${formatMonths(result.experience.requirement.maxMonths)}` : ""}`
                    : "Not stated"}
                </strong>
              </span>
            </div>
            <div className="job-review-timeline">
              {result.experience.entries.map((entry, index) => (
                <article key={`${entry.title}-${index}`}>
                  <i className={entry.relevant ? "relevant" : ""} />
                  <span>
                    <strong>{entry.title}</strong>
                    <small>
                      {entry.months === null
                        ? "Undated · not counted"
                        : `${entry.startMonth} to ${entry.endMonth} · ${formatMonths(entry.months)}`}
                      {entry.relevant ? " · role-relevant" : ""}
                    </small>
                  </span>
                </article>
              ))}
            </div>
          </details>

          {result.education.jobEvidence.length > 0 && (
            <details className="job-review-breakdown">
              <summary>
                <span>
                  <GraduationCap size={15} />
                  <strong>Formal qualification</strong>
                </span>
                <small>{titleCase(result.education.assessment)}</small>
              </summary>
              <div className="job-review-evidence-pair">
                <div className="job-review-evidence">
                  <strong>Your CV evidence</strong>
                  <EvidenceList
                    items={result.education.cvEvidence}
                    empty="No formal qualification is shown in the approved CV."
                  />
                </div>
                <div className="job-review-evidence">
                  <strong>Listing evidence</strong>
                  <EvidenceList
                    items={result.education.jobEvidence}
                    empty="The listing does not state a formal qualification."
                  />
                </div>
              </div>
            </details>
          )}

          <div
            className="job-review-grid"
            aria-label="Detailed evidence comparison"
          >
            {result.dimensions.map((item) => (
              <details className="job-review-dimension" key={item.key}>
                <summary className="job-review-dimension-head">
                  <h4>{labels[item.key]}</h4>
                  <span
                    className={`job-review-verdict verdict-${item.verdict}`}
                  >
                    {verdicts[item.verdict]}
                  </span>
                  <ArrowRight size={14} className="job-review-chevron" />
                </summary>
                <div className="job-review-evidence-pair">
                  <div className="job-review-evidence">
                    <strong>Your CV evidence</strong>
                    <EvidenceList
                      items={item.cvEvidence}
                      empty="This evidence is not stated in the saved CV."
                    />
                  </div>
                  <div className="job-review-evidence">
                    <strong>Listing evidence</strong>
                    <EvidenceList
                      items={item.jobEvidence}
                      empty="The source listing does not state a clear requirement here."
                    />
                  </div>
                </div>
              </details>
            ))}
          </div>
          <p className="job-review-disclaimer">
            “Not demonstrated” means the approved CV does not show that evidence
            here. Verify the original listing before applying.
          </p>
        </div>
      )}

      {error && (
        <div className="job-review-error" role="alert">
          <span>{error}</span>
          {cvAvailable === null && (
            <button
              className="btn small"
              onClick={() => {
                setError("");
                setCvAvailable(null);
                setLoadRetry((value) => value + 1);
              }}
            >
              <RotateCcw size={13} /> Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}

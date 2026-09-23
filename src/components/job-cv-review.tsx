"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  LoaderCircle,
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
  skills: "Skills",
  experience: "Experience",
} as const;
const verdicts = {
  supported: "Supported",
  partial: "Partly supported",
  not_shown: "Not shown in CV",
  unclear: "Needs a closer look",
} as const;

function scoreLabel(score: number) {
  if (score >= 80) return "Strong evidence match";
  if (score >= 60) return "Promising match";
  if (score >= 40) return "Partial match";
  return "Limited evidence";
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
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<AiUsage | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/jobs/${jobId}/cv-review`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Review could not be loaded.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setCvAvailable(result.cvAvailable);
        setReview(result.review);
        setStale(result.stale);
        setUsage(result.usage || null);
      })
      .catch((cause) => {
        if (active) setError((cause as Error).message);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  async function analyze() {
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
            Save a reviewed CV to compare this opportunity with your experience.
          </p>
          <Link href="/app/profile/cv" className="btn">
            Set up your CV <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {cvAvailable && !review && (
        <div className="job-review-prompt">
          <p>
            {stale
              ? "Your CV or this listing changed since the last review. Run a fresh comparison."
              : "Review this listing against the career evidence in your saved CV."}
          </p>
          <button
            className="btn primary"
            disabled={busy || usage?.remaining === 0}
            onClick={() => void analyze()}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {busy ? "Reviewing evidence…" : "Review with JEV"}
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
            JEV receives selected skills and experience excerpts, not your name,
            contact details, or PDF. This is guidance, not a hiring decision.
          </small>
        </div>
      )}
      {review && (
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
              className="job-review-score"
              style={
                {
                  "--review-score": `${review.result.overallScore * 3.6}deg`,
                } as React.CSSProperties
              }
              aria-label={`${review.result.overallScore}% CV evidence coverage`}
            >
              <span>
                <strong>{review.result.overallScore}%</strong>
                <small>coverage</small>
              </span>
            </div>
            <div className="job-review-overview-copy">
              <small>CV EVIDENCE COVERAGE</small>
              <h4>{scoreLabel(review.result.overallScore)}</h4>
              <p>
                This score compares evidence saved in your CV with statements in
                this listing. It is guidance, not a hiring probability.
              </p>
            </div>
            <div className="job-review-signal">
              <Target size={17} />
              <span>
                <strong>
                  {
                    review.result.dimensions.filter(
                      (item) => item.verdict === "supported",
                    ).length
                  }{" "}
                  of 3
                </strong>
                <small>areas strongly supported</small>
              </span>
            </div>
          </div>
          <div className="job-review-insights">
            <article className="job-review-insight positive">
              <div>
                <CheckCircle2 size={16} />
                <strong>Evidence that connects</strong>
              </div>
              {review.result.matchedKeywords.length ? (
                <div className="job-review-chips">
                  {review.result.matchedKeywords.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : (
                <p>
                  No exact skill keyword overlap was found. Review the role
                  evidence below.
                </p>
              )}
            </article>
            <article className="job-review-insight caution">
              <div>
                <CircleAlert size={16} />
                <strong>Check before applying</strong>
              </div>
              {review.result.missingRequirements.length ? (
                <ul>
                  {review.result.missingRequirements.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  No clear requirement gaps were detected in the extracted
                  listing.
                </p>
              )}
            </article>
          </div>
          <div
            className="job-review-grid"
            aria-label="Detailed evidence comparison"
          >
            {review.result.dimensions.map((item) => (
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
            “Not shown” means the saved CV does not demonstrate it here. Check
            the source listing before deciding to apply.
          </p>
        </div>
      )}
      {error && (
        <p className="job-review-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

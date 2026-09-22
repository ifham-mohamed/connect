"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import type { CvReviewResult } from "@/lib/intelligence/cv-review";

type SavedReview = {
  id: string;
  result: CvReviewResult;
  model: string;
  createdAt: string;
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
            disabled={busy}
            onClick={() => void analyze()}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {busy ? "Reviewing evidence…" : "Review with JEV"}
          </button>
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
          <div className="job-review-grid">
            {review.result.dimensions.map((item) => (
              <article className="job-review-dimension" key={item.key}>
                <div className="job-review-dimension-head">
                  <h4>{labels[item.key]}</h4>
                  <span
                    className={`job-review-verdict verdict-${item.verdict}`}
                  >
                    {verdicts[item.verdict]}
                  </span>
                </div>
                <div className="job-review-evidence">
                  <strong>From your CV</strong>
                  <EvidenceList
                    items={item.cvEvidence}
                    empty="No matching evidence found in the saved CV."
                  />
                </div>
                <div className="job-review-evidence">
                  <strong>From this listing</strong>
                  <EvidenceList
                    items={item.jobEvidence}
                    empty="The source listing does not state specific requirements for this area."
                  />
                </div>
              </article>
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

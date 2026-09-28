"use client";
import { safeUrl } from "@/lib/matching";
import type { Job, JobStatus } from "@/lib/types";
import {
  Bookmark,
  BriefcaseBusiness,
  Check,
  ExternalLink,
  Globe2,
  MapPin,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  companyColor,
  dateTime,
  initials,
  JobCvReview,
  JobImageContext,
} from "./shared";

export function JobDetail({
  job,
  loading,
  demo,
  owner,
  aiAnalysisEnabled = true,
  localSkillMatches,
  matchedMonitorNames,
  onStatus,
  onNote,
}: {
  job: Job;
  loading: boolean;
  demo: boolean;
  owner: boolean;
  aiAnalysisEnabled?: boolean;
  localSkillMatches: string[];
  matchedMonitorNames: string[];
  onStatus: (job: Job, status: JobStatus) => Promise<void>;
  onNote: (job: Job, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(job.applicationNote || "");
  const [personalDescription, setPersonalDescription] = useState<string>();
  const [reviewRevision, setReviewRevision] = useState(0);
  const visibleDescription =
    personalDescription || job.extractedDescription || job.description;
  return (
    <div className="job-detail">
      <section className="detail-summary" aria-labelledby="opportunity-title">
        <div className="detail-title">
          <span className={`company-avatar ${companyColor(job.company)}`}>
            {initials(job.company)}
          </span>
          <div>
            <h2 id="opportunity-title">{job.title}</h2>
            <p>{job.company}</p>
          </div>
        </div>
        <div className="detail-meta">
          <span>
            <MapPin size={14} />
            {job.location}
          </span>
          <span>
            <BriefcaseBusiness size={14} />
            {job.employmentType || "Type not specified"}
          </span>
          {job.remote && (
            <span>
              <Globe2 size={14} />
              Remote
            </span>
          )}
        </div>
        <div className="detail-toolbar">
          <span className={`status-badge status-${job.status} detail-status`}>
            {job.status === "applied" && <Check size={12} />}
            {job.status === "saved" && <Bookmark size={12} />}
            {job.status === "archived" && <Trash2 size={12} />}
            {job.status === "new" ? "New" : job.status}
          </span>
          <div className="detail-actions">
            {!demo && safeUrl(job.url) && (
              <a
                className="btn primary detail-source-action"
                href={safeUrl(job.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {job.sourceName}
                <ExternalLink size={14} />
              </a>
            )}
            <button
              className="btn"
              onClick={() =>
                onStatus(job, job.status === "saved" ? "new" : "saved")
              }
            >
              <Bookmark size={14} />
              {job.status === "saved" ? "Saved" : "Save job"}
            </button>
            <button
              className="btn"
              onClick={() =>
                onStatus(job, job.status === "applied" ? "new" : "applied")
              }
            >
              <Check size={14} />
              {job.status === "applied" ? "Applied" : "Mark applied"}
            </button>
          </div>
        </div>
      </section>
      {demo && (
        <div className="demo-notice">
          Illustrative sample — this is not a verified job opening.
        </div>
      )}
      {!demo && aiAnalysisEnabled && (
        <JobCvReview key={`${job.id}-${reviewRevision}`} jobId={job.id} />
      )}
      {!demo && (job.sourceImageUrl || /topjobs/i.test(job.sourceName)) && (
        <div id="listing-text-workspace">
          <JobImageContext
            key={`${job.id}-${job.extractedAt || "new"}`}
            jobId={job.id}
            imageUrl={job.sourceImageUrl}
            listingUrl={job.url}
            initialText={job.extractedDescription}
            initialConfidence={job.extractedDescriptionConfidence}
            extractedAt={job.extractedAt}
            onSaved={(text) => {
              setPersonalDescription(text);
              setReviewRevision((current) => current + 1);
            }}
          />
        </div>
      )}
      <section
        className="detail-description"
        aria-labelledby="opportunity-about"
      >
        <h3 id="opportunity-about">About the opportunity</h3>
        {loading ? (
          <div
            className="detail-loading"
            aria-label="Loading opportunity details"
            aria-live="polite"
          >
            <span />
            <span />
            <span />
          </div>
        ) : (
          <p>
            {visibleDescription ||
              "Read the full description on the original listing."}
          </p>
        )}
      </section>
      {!!job.requirements?.length && (
        <section className="detail-description">
          <h3>Requirements found in this listing</h3>
          <p>
            Each item is quoted from the source text. Labels are a review aid,
            not a verified hiring decision.
          </p>
          <ul className="requirement-list">
            {job.requirements.map((item, index) => (
              <li key={`${index}-${item.evidence}`}>
                <span className="requirement-kind">{item.importance}</span>{" "}
                <span className="requirement-kind">{item.category}</span>{" "}
                {item.groupKind !== "single" && (
                  <span className="requirement-kind">
                    {item.groupKind.toUpperCase()} group
                  </span>
                )}{" "}
                {item.evidence}
              </li>
            ))}
          </ul>
          {!!job.profileSkillMatches?.length && (
            <p>
              Skills from your profile mentioned here:{" "}
              {job.profileSkillMatches.join(", ")}
            </p>
          )}
        </section>
      )}
      {!!localSkillMatches.length && (
        <section className="detail-description cv-local-match">
          <h3>Quick skill overlap</h3>
          <p>
            Skills from your saved CV mentioned in the listing text:{" "}
            {localSkillMatches.join(", ")}. This is a simple text check; the JEV
            review above considers the selected career evidence.
          </p>
        </section>
      )}
      {!!matchedMonitorNames.length && (
        <section className="detail-description">
          <h3>Why this appears in Relevant</h3>
          <p>
            Matched your monitor{matchedMonitorNames.length > 1 ? "s" : ""}:{" "}
            {matchedMonitorNames.join(", ")}.
          </p>
        </section>
      )}
      {!demo && (
        <section className="detail-description">
          <h3>Private application note</h3>
          <label className="settings-field">
            <span>Track your next step or follow-up</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g. Applied on the company site; follow up next week"
            />
          </label>
          <button
            className="btn"
            disabled={note.trim() === (job.applicationNote || "")}
            onClick={() => void onNote(job, note).catch(() => {})}
          >
            Save note
          </button>
          {job.appliedAt && <p>Marked applied: {dateTime(job.appliedAt)}</p>}
        </section>
      )}
      <dl className="detail-dates">
        <div>
          <dt>Original source</dt>
          <dd>{job.sourceName}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{dateTime(job.publishedAt)}</dd>
        </div>
        <div>
          <dt>First discovered</dt>
          <dd>{dateTime(job.firstSeenAt)}</dd>
        </div>
        <div>
          <dt>Last seen in source</dt>
          <dd>{dateTime(job.lastSeenAt)}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>{job.salary || "Not disclosed"}</dd>
        </div>
      </dl>
      {owner && !demo && (
        <details className="detail-owner-tools">
          <summary>Owner diagnostics</summary>
          <button
            className="btn small"
            type="button"
            onClick={() => void navigator.clipboard.writeText(job.id)}
          >
            Copy job ID for AI controls
          </button>
        </details>
      )}
      <p className="muted">
        Confirm availability and country eligibility on the source website
        before applying.
      </p>
      <button
        className="text-btn"
        onClick={() =>
          onStatus(job, job.status === "archived" ? "new" : "archived")
        }
      >
        {job.status === "archived"
          ? "Restore opportunity"
          : "Archive this opportunity"}
      </button>
    </div>
  );
}

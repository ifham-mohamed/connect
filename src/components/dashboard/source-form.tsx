"use client";
import type { SourceKind } from "@/lib/types";
import { sourceSchema } from "@/lib/validation";
import { Clock3, Link2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { kindNames } from "./shared";

export function SourceForm({
  onSave,
}: {
  onSave: (value: {
    name: string;
    kind: SourceKind;
    board: string;
  }) => Promise<void>;
}) {
  const [kind, setKind] = useState<SourceKind>("itpro");
  const [name, setName] = useState("ITPro.lk");
  const [board, setBoard] = useState("software-engineering");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(
            sourceSchema.parse({
              name,
              kind,
              board,
            }),
          );
        } catch (e) {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "Enter a name and a valid employer board identifier."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Connect a public feed or an employer’s career board. We’ll preserve the
        original source of every opportunity.
      </p>
      <label>
        Source type
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as SourceKind;
            setKind(k);
            setName(kindNames[k]);
            setBoard(
              k === "topjobs"
                ? "SDQ"
                : k === "xpressjobs"
                  ? "it"
                  : k === "jobeka"
                    ? "IT-Software-and-Design"
                    : k === "itpro"
                      ? "software-engineering"
                      : "",
            );
          }}
        >
          {Object.entries(kindNames).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Display name
        <input
          required
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {[
        "itpro",
        "topjobs",
        "xpressjobs",
        "jobeka",
        "greenhouse",
        "lever",
      ].includes(kind) && (
        <label>
          {["greenhouse", "lever"].includes(kind)
            ? "Employer board identifier"
            : "Source category"}
          {kind === "itpro" ? (
            <select value={board} onChange={(e) => setBoard(e.target.value)}>
              <option value="software-engineering">Software Engineering</option>
              <option value="web-development">Web Development</option>
              <option value="mobile-development">Mobile Development</option>
              <option value="devops-cloud">DevOps and Cloud</option>
              <option value="ai-and-data">AI and Data</option>
            </select>
          ) : (
            <input
              required
              placeholder={
                kind === "greenhouse"
                  ? "e.g. acme"
                  : kind === "lever"
                    ? "e.g. dijital-team-pty-ltd"
                    : kind === "topjobs"
                      ? "SDQ"
                      : kind === "xpressjobs"
                        ? "it"
                        : "IT-Software-and-Design"
              }
              pattern="[a-zA-Z0-9_-]+"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
            />
          )}
          <small>
            {["greenhouse", "lever"].includes(kind)
              ? `The employer name in its ${kindNames[kind]} board URL. Enter the identifier, not the full URL.`
              : kind === "xpressjobs"
                ? "Use it for the XpressJobs IT sector path."
                : "Use the default category identifier for this public Sri Lankan job source."}
          </small>
        </label>
      )}
      <div className="source-form-note">
        <Clock3 size={18} />
        <p>
          {kind === "remotive"
            ? "Checks every 6 hours. Remotive’s public listings are delayed by 24 hours and always link back to Remotive."
            : kind === "itpro"
              ? "Checks every hour. Choose a focused ITPro category; every listing keeps its original page and full job description."
              : kind === "topjobs"
                ? "Checks every hour. Uses TopJobs’ Software Development / QA category page."
                : kind === "xpressjobs"
                  ? "Checks every hour. Uses XpressJobs’ public IT sector page."
                  : kind === "jobeka"
                    ? "Checks every 6 hours. Uses JobEka’s IT Software & Design category page."
                    : kind === "rooster"
                      ? "Checks every hour. Tracks Rooster’s public jobs landing page for Sri Lankan openings."
                      : kind === "neojobs"
                        ? "Checks every hour. Tracks Neo Jobs for Sri Lankan tech and remote listings."
                        : kind === "jobster"
                          ? "Checks every 6 hours. Tracks Jobster’s public AI job-search portal."
                          : kind === "arbeitnow"
                            ? "Checks every 6 hours. Collects the latest page of European jobs; use an employer board for full employer coverage."
                            : "Checks every hour. Connects this specific employer’s publicly listed jobs."}
        </p>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Link2 size={16} />
          )}
          Connect source
        </button>
      </div>
    </form>
  );
}

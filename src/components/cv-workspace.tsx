"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { CvProfile } from "@/lib/cv/profile";
import { extractCvInBrowser } from "@/lib/cv/extract-client";

export default function CvWorkspace({
  profile,
  onChange,
  revision,
  onSaved,
}: {
  profile: CvProfile | null;
  onChange: (profile: CvProfile | null) => void;
  revision: number;
  onSaved: (revision: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({
    status: "",
    completed: 0,
    total: 1,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewing, setViewing] = useState(revision > 0);
  const [dragging, setDragging] = useState(false);
  const counts = useMemo(
    () => ({
      skills:
        profile?.skills.reduce((sum, group) => sum + group.items.length, 0) ||
        0,
      entries:
        profile?.sections.reduce(
          (sum, section) => sum + section.entries.length,
          0,
        ) || 0,
    }),
    [profile],
  );

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    setProgress({
      status: "Preparing local extraction",
      completed: 0,
      total: 1,
    });
    const startedAt = performance.now();
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const parsed = await extractCvInBrowser(
        file,
        (status, completed, total) => setProgress({ status, completed, total }),
      );
      setProgress({ status: "Preparing your review", completed: 1, total: 1 });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const remaining = Math.max(0, 480 - (performance.now() - startedAt));
        if (remaining)
          await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
      onChange(parsed);
      setSaved(false);
      setDirty(true);
      setViewing(false);
      setProgress({ status: "Ready to review", completed: 1, total: 1 });
    } catch (cause) {
      setError((cause as Error).message || "This CV could not be read.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  function update(next: CvProfile) {
    onChange(next);
    setSaved(false);
    setDirty(true);
  }
  async function saveApproved() {
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/candidate/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          baseRevision: revision,
          profile,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The CV could not be saved.");
      onSaved(result.cv.revision);
      setSaved(true);
      setDirty(false);
      setViewing(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function removeCv() {
    if (
      !window.confirm(
        "Delete your saved CV profile from this account? This cannot be undone.",
      )
    )
      return;
    setSaving(true);
    setError("");
    try {
      if (revision) {
        const response = await fetch("/api/candidate/cv", { method: "DELETE" });
        if (!response.ok) throw new Error("The saved CV could not be removed.");
      }
      onChange(null);
      onSaved(0);
      setSaved(false);
      setDirty(false);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function exportLocal() {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jobradar-cv-profile.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="settings-card cv-workspace">
      <div className="cv-intro">
        <span className="cv-intro-icon">
          <FileText size={22} />
        </span>
        <div>
          <small>Your private career profile</small>
          <h3>Turn your CV into a clear profile</h3>
          <p>
            Extraction happens in your browser. Review and edit every detail,
            then save the approved profile to your account. The PDF file is
            never uploaded or sent to JEV.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        className="cv-file-input"
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        onChange={(event) => void importFile(event.target.files?.[0])}
        aria-label="Choose a PDF or text CV"
      />
      <button
        type="button"
        className={`cv-dropzone${dragging ? " dragging" : ""}`}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void importFile(event.dataTransfer.files[0]);
        }}
      >
        <span className="cv-drop-icon">
          <UploadCloud size={21} />
        </span>
        <span>
          <strong>{profile ? "Replace CV" : "Choose or drop a CV"}</strong>
          <small>Text-based PDF or TXT · up to 8 MB · 20 pages</small>
        </span>
        <span className="cv-drop-action">Browse files</span>
      </button>
      {busy && (
        <div className="cv-progress" role="status" aria-live="polite">
          <div className="cv-progress-head">
            <span className="cv-progress-orbit">
              <Sparkles size={17} />
            </span>
            <div>
              <strong>Building your profile</strong>
              <small>{progress.status}</small>
            </div>
            <span>
              {Math.round((progress.completed / progress.total) * 100)}%
            </span>
          </div>
          <div className="cv-progress-track">
            <span
              style={{
                width: `${Math.max(8, (progress.completed / progress.total) * 100)}%`,
              }}
            />
          </div>
          <div className="cv-progress-steps">
            <span className="active">Read</span>
            <span className={progress.completed > 0 ? "active" : ""}>
              Structure
            </span>
            <span
              className={
                progress.status === "Preparing your review" ? "active" : ""
              }
            >
              Review
            </span>
          </div>
        </div>
      )}
      {error && (
        <p className="cv-error" role="alert">
          {error}
        </p>
      )}
      {profile && !busy && (
        <>
          <div className="cv-review-head">
            <div>
              <small>Extracted in your browser</small>
              <h4>{profile.source.fileName}</h4>
              <p>
                {profile.source.pages} page
                {profile.source.pages === 1 ? "" : "s"} · {counts.skills} skills
                · {counts.entries} entries · {profile.sections.length} sections
              </p>
            </div>
            <div className="cv-review-controls">
              <span className="cv-ready">
                <Check size={13} />{" "}
                {dirty
                  ? "Unsaved changes"
                  : saved || revision
                    ? "Saved to your account"
                    : "Ready to review"}
              </span>
              {revision > 0 && (
                <button
                  className="btn small"
                  type="button"
                  onClick={() => setViewing(!viewing)}
                >
                  {viewing ? "Edit details" : "View profile"}
                </button>
              )}
            </div>
          </div>
          {viewing ? (
            <div className="cv-profile-view">
              <div className="cv-profile-hero">
                <span className="cv-profile-avatar">
                  {(profile.identity.name || "CV")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div>
                  <small>Professional profile</small>
                  <h2>{profile.identity.name || "Your career profile"}</h2>
                  <p>
                    {profile.identity.headline ||
                      "Add a professional headline in Edit details."}
                  </p>
                  <div className="cv-profile-meta">
                    <span className="cv-profile-status">
                      <Check size={12} /> Reviewed and saved
                    </span>
                    <span>
                      {profile.source.pages}{" "}
                      {profile.source.pages === 1 ? "page" : "pages"}
                    </span>
                    <span>{counts.skills} extracted skills</span>
                    {[
                      profile.identity.location,
                      profile.identity.email,
                      profile.identity.phone,
                    ]
                      .filter(Boolean)
                      .map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                  </div>
                </div>
              </div>
              {profile.identity.links.length > 0 && (
                <div className="cv-profile-links">
                  {profile.identity.links.map((link) => (
                    <span key={link}>{link}</span>
                  ))}
                </div>
              )}
              {profile.summary && (
                <section className="cv-profile-block">
                  <small>About</small>
                  <p>{profile.summary}</p>
                </section>
              )}
              {profile.skills.length > 0 && (
                <section className="cv-profile-block">
                  <small>Expertise</small>
                  <div className="cv-profile-skill-grid">
                    {profile.skills.map((group, index) => (
                      <div key={`${group.category}-${index}`}>
                        <h3>{group.category}</h3>
                        <div>
                          {group.items.map((item, itemIndex) => (
                            <span key={`${item}-${itemIndex}`}>{item}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {profile.sections.map((section) => (
                <section className="cv-profile-block" key={section.id}>
                  <small>{section.title}</small>
                  <div className="cv-profile-timeline">
                    {section.entries.map((entry, index) => (
                      <article key={`${section.id}-${index}`}>
                        <h3>{entry.heading}</h3>
                        {entry.details.map((detail, detailIndex) => (
                          <p className="cv-profile-detail" key={detailIndex}>
                            {detail}
                          </p>
                        ))}
                        {entry.bullets.length > 0 && (
                          <ul>
                            {entry.bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
              <details className="cv-raw">
                <summary>View original extracted text</summary>
                <pre>{profile.rawText}</pre>
              </details>
              <div className="cv-profile-footer">
                <span>
                  Extracted from {profile.source.fileName} ·{" "}
                  {new Date(profile.source.importedAt).toLocaleDateString()}
                </span>
                <div className="cv-review-controls">
                  <button className="btn" type="button" onClick={exportLocal}>
                    <ArrowDownToLine size={14} /> Export profile
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={saving}
                    onClick={() => void removeCv()}
                  >
                    <Trash2 size={14} /> Delete CV
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="cv-review-grid">
                <div className="cv-panel">
                  <h4>Identity and contact</h4>
                  <div className="cv-field-grid">
                    {(
                      [
                        "name",
                        "headline",
                        "email",
                        "phone",
                        "location",
                      ] as const
                    ).map((field) => (
                      <label className="settings-field" key={field}>
                        <span>
                          {
                            (
                              {
                                name: "Full name",
                                headline: "Professional headline",
                                email: "Email address",
                                phone: "Phone number",
                                location: "Location",
                              } as const
                            )[field]
                          }
                        </span>
                        <input
                          value={profile.identity[field]}
                          onChange={(event) =>
                            update({
                              ...profile,
                              identity: {
                                ...profile.identity,
                                [field]: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label className="settings-field">
                    <span>Links, one per line</span>
                    <textarea
                      rows={2}
                      value={profile.identity.links.join("\n")}
                      onChange={(event) =>
                        update({
                          ...profile,
                          identity: {
                            ...profile.identity,
                            links: event.target.value
                              .split("\n")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="cv-panel">
                  <h4>Professional summary</h4>
                  <label className="settings-field">
                    <span>Edit extracted summary</span>
                    <textarea
                      rows={6}
                      value={profile.summary}
                      onChange={(event) =>
                        update({ ...profile, summary: event.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="cv-panel">
                <div className="cv-panel-title">
                  <h4>Skills by category</h4>
                  <button
                    className="btn small"
                    type="button"
                    onClick={() =>
                      update({
                        ...profile,
                        skills: [
                          ...profile.skills,
                          { category: "New category", items: [] },
                        ],
                      })
                    }
                  >
                    <Plus size={13} /> Add category
                  </button>
                </div>
                <div className="cv-skill-grid">
                  {profile.skills.map((group, index) => (
                    <div
                      className="cv-skill-group"
                      key={`${index}-${group.category}`}
                    >
                      <div className="cv-skill-heading">
                        <input
                          aria-label="Skill category"
                          value={group.category}
                          onChange={(event) =>
                            update({
                              ...profile,
                              skills: profile.skills.map((item, i) =>
                                i === index
                                  ? { ...item, category: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${group.category}`}
                          onClick={() =>
                            update({
                              ...profile,
                              skills: profile.skills.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        aria-label={`${group.category} skills, comma-separated`}
                        rows={3}
                        value={group.items.join(", ")}
                        onChange={(event) =>
                          update({
                            ...profile,
                            skills: profile.skills.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    items: event.target.value
                                      .split(",")
                                      .map((value) => value.trim())
                                      .filter(Boolean),
                                  }
                                : item,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="cv-sections">
                {profile.sections.map((section, sectionIndex) => (
                  <details className="cv-section" key={section.id}>
                    <summary>
                      <span>{section.title}</span>
                      <small>
                        {section.entries.length}{" "}
                        {section.entries.length === 1 ? "entry" : "entries"}
                      </small>
                    </summary>
                    <div className="cv-section-body">
                      {section.entries.map((entry, entryIndex) => (
                        <div
                          className="cv-entry"
                          key={`${section.id}-${entryIndex}`}
                        >
                          <input
                            aria-label={`${section.title} entry heading`}
                            value={entry.heading}
                            onChange={(event) =>
                              update({
                                ...profile,
                                sections: profile.sections.map((item, i) =>
                                  i === sectionIndex
                                    ? {
                                        ...item,
                                        entries: item.entries.map((value, j) =>
                                          j === entryIndex
                                            ? {
                                                ...value,
                                                heading: event.target.value,
                                              }
                                            : value,
                                        ),
                                      }
                                    : item,
                                ),
                              })
                            }
                          />
                          <button
                            type="button"
                            aria-label="Remove entry"
                            onClick={() =>
                              update({
                                ...profile,
                                sections: profile.sections.map((item, i) =>
                                  i === sectionIndex
                                    ? {
                                        ...item,
                                        entries: item.entries.filter(
                                          (_, j) => j !== entryIndex,
                                        ),
                                      }
                                    : item,
                                ),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                          <textarea
                            aria-label="Entry details, one per line"
                            rows={Math.max(2, entry.details.length)}
                            value={entry.details.join("\n")}
                            onChange={(event) =>
                              update({
                                ...profile,
                                sections: profile.sections.map((item, i) =>
                                  i === sectionIndex
                                    ? {
                                        ...item,
                                        entries: item.entries.map((value, j) =>
                                          j === entryIndex
                                            ? {
                                                ...value,
                                                details:
                                                  event.target.value.split(
                                                    "\n",
                                                  ),
                                              }
                                            : value,
                                        ),
                                      }
                                    : item,
                                ),
                              })
                            }
                          />
                          <textarea
                            aria-label="Entry achievements, one per line"
                            rows={Math.max(3, entry.bullets.length)}
                            value={entry.bullets.join("\n")}
                            onChange={(event) =>
                              update({
                                ...profile,
                                sections: profile.sections.map((item, i) =>
                                  i === sectionIndex
                                    ? {
                                        ...item,
                                        entries: item.entries.map((value, j) =>
                                          j === entryIndex
                                            ? {
                                                ...value,
                                                bullets:
                                                  event.target.value.split(
                                                    "\n",
                                                  ),
                                              }
                                            : value,
                                        ),
                                      }
                                    : item,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                      <button
                        className="btn small"
                        type="button"
                        onClick={() =>
                          update({
                            ...profile,
                            sections: profile.sections.map((item, i) =>
                              i === sectionIndex
                                ? {
                                    ...item,
                                    entries: [
                                      ...item.entries,
                                      {
                                        heading: "New entry",
                                        details: [],
                                        bullets: [],
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          })
                        }
                      >
                        <Plus size={13} /> Add entry
                      </button>
                    </div>
                  </details>
                ))}
              </div>
              <details className="cv-raw">
                <summary>View original extracted text</summary>
                <pre>{profile.rawText}</pre>
              </details>
              <div className="cv-actions">
                <p>
                  Only your reviewed profile is saved. This includes the
                  extracted text shown above so you can check it later. You can
                  export or delete it at any time.
                </p>
                <div className="settings-actions">
                  <button
                    className="btn primary"
                    type="button"
                    disabled={saving}
                    onClick={() => void saveApproved()}
                  >
                    {saved ? <Check size={14} /> : <FileText size={14} />}
                    {saving
                      ? "Saving…"
                      : saved
                        ? "Saved to account"
                        : "Approve and save"}
                  </button>
                  <button className="btn" type="button" onClick={exportLocal}>
                    <ArrowDownToLine size={14} /> Export structured JSON
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={saving}
                    onClick={() => void removeCv()}
                  >
                    <Trash2 size={14} /> Remove CV
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

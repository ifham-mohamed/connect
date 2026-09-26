"use client";
import type { Monitor } from "@/lib/types";
import { monitorSchema } from "@/lib/validation";
import { LoaderCircle, Radio, Trash2 } from "lucide-react";
import { useState } from "react";

export function MonitorForm({
  monitor,
  onSave,
  onDelete,
}: {
  monitor?: Monitor;
  onSave: (value: Omit<Monitor, "id" | "createdAt">) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(monitor?.name || "");
  const [keywords, setKeywords] = useState(monitor?.keywords.join(", ") || "");
  const [excluded, setExcluded] = useState(
    monitor?.excludedKeywords.join(", ") || "",
  );
  const [location, setLocation] = useState(monitor?.location || "");
  const [workModes, setWorkModes] = useState<
    Array<"onsite" | "hybrid" | "remote">
  >(
    monitor?.workModes ||
      (monitor?.remoteOnly ? ["remote"] : ["onsite", "hybrid", "remote"]),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const split = (v: string) =>
    Array.from(
      new Set(
        v
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      ),
    );
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const value = monitorSchema.parse({
            name,
            keywords: split(keywords),
            excludedKeywords: split(excluded),
            location,
            remoteOnly: workModes.length === 1 && workModes[0] === "remote",
            workModes,
            enabled: monitor?.enabled ?? true,
          });
          await onSave(value);
        } catch (e) {
          setError(
            e instanceof Error && e.name === "ZodError"
              ? "Give your monitor a name and at least one keyword (maximum 20)."
              : (e as Error).message,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="form-intro">
        Tell us what a good fit looks like. We’ll gather matching opportunities
        as your sources update.
      </p>
      <label>
        Monitor name
        <input
          required
          maxLength={80}
          placeholder="e.g. My next frontend role"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Keywords <span>Separate with commas</span>
        <input
          required
          placeholder="React, TypeScript, frontend"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <small>
          A job matches if any keyword appears in its title, company, tags, or
          description.
        </small>
      </label>
      <label>
        Exclude keywords <span>Optional</span>
        <input
          placeholder="Senior, lead, manager"
          value={excluded}
          onChange={(e) => setExcluded(e.target.value)}
        />
      </label>
      <label>
        Location <span>Optional</span>
        <input
          placeholder="Sri Lanka, Colombo, or leave blank for anywhere"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <small>
          Use one location phrase. Remote roles can still have country
          restrictions.
        </small>
      </label>
      <fieldset className="form-choice-group">
        <legend>Work arrangements</legend>
        {(["onsite", "hybrid", "remote"] as const).map((mode) => (
          <label className="checkbox-label" key={mode}>
            <input
              type="checkbox"
              checked={workModes.includes(mode)}
              onChange={() =>
                setWorkModes((current) =>
                  current.includes(mode)
                    ? current.filter((item) => item !== mode)
                    : [...current, mode],
                )
              }
            />
            {mode === "onsite"
              ? "On-site"
              : mode[0].toUpperCase() + mode.slice(1)}
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        {onDelete && (
          <button
            type="button"
            className="text-btn danger"
            disabled={busy}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              setBusy(true);
              try {
                await onDelete();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 size={14} />
            {confirmDelete ? "Confirm deletion" : "Delete monitor"}
          </button>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Radio size={16} />
          )}{" "}
          {monitor ? "Save changes" : "Create monitor"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  Check,
  Clipboard,
  ExternalLink,
  FileImage,
  LoaderCircle,
  ScanText,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { normalizeAdvertText, validAdvertImage } from "@/lib/ocr/advert-text";

type Phase = "idle" | "reading" | "review" | "saving" | "saved";

export default function JobImageContext({
  jobId,
  imageUrl,
  initialText = "",
  initialConfidence = null,
  extractedAt = null,
  onSaved,
}: {
  jobId: string;
  imageUrl?: string;
  initialText?: string;
  initialConfidence?: number | null;
  extractedAt?: string | null;
  onSaved: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText);
  const [confidence, setConfidence] = useState<number | null>(
    initialConfidence,
  );
  const [phase, setPhase] = useState<Phase>(initialText ? "saved" : "idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  if (!imageUrl) return null;

  async function recognize(file: File | Blob) {
    if (file instanceof File && !validAdvertImage(file)) {
      setMessage("Choose a PNG, JPG, or WebP image smaller than 10 MB.");
      return;
    }
    setPhase("reading");
    setMessage("");
    setProgress(4);
    let worker: Awaited<
      ReturnType<(typeof import("tesseract.js"))["createWorker"]>
    > | null = null;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: (event) => {
          if (event.status === "recognizing text")
            setProgress(Math.max(8, Math.round(event.progress * 100)));
        },
      });
      const result = await worker.recognize(file);
      const cleaned = normalizeAdvertText(result.data.text);
      if (cleaned.length < 40)
        throw new Error(
          "Not enough readable text was found. Try a clearer image.",
        );
      setText(cleaned);
      setConfidence(Math.round(result.data.confidence * 10) / 10);
      setProgress(100);
      setPhase("review");
    } catch (cause) {
      setPhase(initialText ? "saved" : "idle");
      setMessage(
        cause instanceof Error ? cause.message : "The image could not be read.",
      );
    } finally {
      await worker?.terminate().catch(() => {});
    }
  }

  async function analyzeOriginal() {
    try {
      const response = await fetch(imageUrl!, {
        mode: "cors",
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error("The original image could not be loaded.");
      const blob = await response.blob();
      await recognize(blob);
    } catch {
      setMessage(
        "TopJobs prevents this site from reading the image pixels directly. Open the advert image, copy it, then use Paste image below—or save it and choose the file.",
      );
    }
  }

  async function pasteImage() {
    setMessage("");
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((value) => value.startsWith("image/"));
        if (type) return void recognize(await item.getType(type));
      }
      throw new Error("No copied image was found on the clipboard.");
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Clipboard access was unavailable. Choose the saved image instead.",
      );
    }
  }

  async function save() {
    const cleaned = normalizeAdvertText(text);
    if (cleaned.length < 40) {
      setMessage("Keep at least 40 characters of reviewed job information.");
      return;
    }
    setPhase("saving");
    setMessage("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/image-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned, confidence }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "The extracted text could not be saved.",
        );
      setText(result.text);
      setPhase("saved");
      onSaved(result.text);
    } catch (cause) {
      setPhase("review");
      setMessage(
        cause instanceof Error
          ? cause.message
          : "The extracted text could not be saved.",
      );
    }
  }

  async function clear() {
    const response = await fetch(`/api/jobs/${jobId}/image-context`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.error || "The extracted text could not be removed.");
      return;
    }
    setText("");
    setConfidence(null);
    setPhase("idle");
    onSaved("");
  }

  return (
    <section
      className="image-context-card"
      aria-label="Advert image text extraction"
    >
      <div className="image-context-heading">
        <span>
          <ScanText size={18} />
        </span>
        <div>
          <small>ON-DEVICE IMAGE READING</small>
          <h3>Turn this advert into searchable context</h3>
          <p>
            The image stays in this browser. Review the text before saving it to
            your private job record.
          </p>
        </div>
        <span className="image-context-private">
          <ShieldCheck size={13} /> Private
        </span>
      </div>
      <div className="image-context-layout">
        <div className="image-context-preview">
          {/* The remote image is displayed only; pixel processing starts after a user action. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Original TopJobs vacancy advert"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            Open original image <ExternalLink size={13} />
          </a>
        </div>
        <div className="image-context-workspace">
          {phase === "reading" ? (
            <div className="image-context-progress" aria-live="polite">
              <LoaderCircle className="spin" size={24} />
              <strong>Reading the advert on this device…</strong>
              <div>
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>{progress}% · Nothing has been uploaded</small>
            </div>
          ) : text ? (
            <>
              <div className="image-context-review-head">
                <div>
                  <strong>
                    {phase === "saved"
                      ? "Saved private context"
                      : "Review extracted text"}
                  </strong>
                  <small>
                    {confidence !== null
                      ? `${confidence}% OCR confidence`
                      : "Confidence unavailable"}
                    {phase === "saved" && extractedAt
                      ? ` · ${new Date(extractedAt).toLocaleDateString()}`
                      : ""}
                  </small>
                </div>
                {phase === "saved" && (
                  <span>
                    <Check size={13} /> Ready for JEV
                  </span>
                )}
              </div>
              <textarea
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setPhase("review");
                }}
                rows={11}
                maxLength={30_000}
                aria-label="Extracted job advert text"
              />
              <div className="image-context-actions">
                <button
                  className="btn primary"
                  onClick={() => void save()}
                  disabled={phase === "saving" || phase === "saved"}
                >
                  {phase === "saving" ? (
                    <LoaderCircle className="spin" size={15} />
                  ) : (
                    <Check size={15} />
                  )}
                  {phase === "saving"
                    ? "Saving…"
                    : phase === "saved"
                      ? "Saved"
                      : "Approve and save"}
                </button>
                {phase === "saved" && (
                  <button className="btn" onClick={() => void clear()}>
                    <Trash2 size={14} /> Remove private text
                  </button>
                )}
              </div>
            </>
          ) : (
            <div
              className="image-context-start"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) void recognize(file);
              }}
            >
              <FileImage size={28} />
              <strong>Read the job advert</strong>
              <p>
                Try the original first. If TopJobs blocks pixel access, copy the
                image and paste it here, drop it here, or choose the saved file.
              </p>
              <div className="image-context-actions">
                <button
                  className="btn primary"
                  onClick={() => void analyzeOriginal()}
                >
                  <ScanText size={15} /> Analyze original
                </button>
                <button className="btn" onClick={() => void pasteImage()}>
                  <Clipboard size={15} /> Paste image
                </button>
                <button
                  className="btn"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={15} /> Choose image
                </button>
              </div>
              <input
                ref={inputRef}
                className="image-context-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void recognize(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          )}
          {message && (
            <p className="image-context-message" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

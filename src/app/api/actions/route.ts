import { addSource, toggleSource } from "@/lib/actions/sources";
import {
  setJobStatus,
  setJobNote,
  markJobReviewed,
  canAccessJob,
} from "@/lib/actions/job-state";
import { updateProfile } from "@/lib/actions/profile";
import { changeMonitor } from "@/lib/actions/monitors";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncSources } from "@/lib/sync";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { recordSecurityEvent } from "@/lib/security";
import {
  consumeRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/lib/rate-limit";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const body = z
      .object({
        action: z.enum([
          "monitor-save",
          "monitor-delete",
          "source-add",
          "source-toggle",
          "job-status",
          "job-reviewed",
          "job-note",
          "profile-update",
          "sync",
        ]),
        id: z.string().uuid().optional(),
        data: z.unknown().optional(),
      })
      .parse(await readJsonBody(request, 20_000));
    const ownerAction = ["source-add", "source-toggle", "sync"].includes(
      body.action,
    );
    const user = await authorizeWrite(
      request,
      ownerAction ? "owner" : "member",
    );
    if (body.action === "sync") {
      const rate = await consumeRateLimit(
        db(),
        "actions:source-sync",
        user.id,
        3,
        900,
      );
      if (!rate.allowed) throw new RateLimitError(rate.retryAfter, rate.limit);
    }
    if (["job-status", "job-reviewed", "job-note"].includes(body.action)) {
      const jobId = z.string().uuid().parse(body.id);
      if (!(await canAccessJob(user.id, jobId, user.role))) {
        await recordSecurityEvent({
          request,
          eventType: "authorization.job_access_denied",
          severity: "critical",
          userId: user.id,
          metadata: { action: body.action, jobId },
        });
        throw new Error("JOB_NOT_FOUND");
      }
    }
    if (body.action === "sync") return NextResponse.json(await syncSources());
    if (body.action === "source-add") await addSource(body.data);
    else if (body.action === "source-toggle")
      await toggleSource(body.id, body.data);
    else if (body.action === "job-status")
      await setJobStatus(user.id, body.id, body.data);
    else if (body.action === "job-note")
      await setJobNote(user.id, body.id, body.data);
    else if (body.action === "job-reviewed")
      await markJobReviewed(user.id, body.id);
    else if (body.action === "profile-update")
      await updateProfile(user.id, body.data);
    else await changeMonitor(user.id, body.action, body.id, body.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json(
        { error: "Sign in to make changes in this workspace." },
        { status: 401 },
      );
    if (message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Request origin is not allowed. Check APP_URL." },
        { status: 403 },
      );
    if (message === "OWNER_REQUIRED")
      return NextResponse.json(
        {
          error:
            "Only the workspace owner can manage sources or run collection.",
        },
        { status: 403 },
      );
    if (message === "JOB_NOT_FOUND" || message === "MONITOR_NOT_FOUND")
      return NextResponse.json(
        { error: "The requested item was not found." },
        { status: 404 },
      );
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return NextResponse.json(
        { error: "This source is already connected." },
        { status: 409 },
      );
    console.error("Action failed", error);
    return NextResponse.json(
      { error: "The change could not be saved. Please try again." },
      { status: 500 },
    );
  }
}

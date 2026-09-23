import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWrite, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cvProfileSchema } from "@/lib/cv/schema";
import { getJobDetail } from "@/lib/repository";
import { createJevClient } from "@/lib/jev/client";
import { jevConfig } from "@/lib/jev/config";
import { jobCvHash, reviewJobAgainstCv } from "@/lib/intelligence/cv-review";
import {
  completeAiJobAnalysis,
  getAiUsage,
  reserveAiJobAnalysis,
  type AiUsage,
} from "@/lib/ai-usage";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  completeWorkspaceAiRequest,
  pauseWorkspaceAi,
  reserveWorkspaceAiRequest,
} from "@/lib/ai-budget";

export const dynamic = "force-dynamic";
const jobIdSchema = z.string().uuid();
type Context = { params: Promise<{ id: string }> };

function usageHeaders(usage: AiUsage) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (!usage.unlimited && usage.limit !== null && usage.remaining !== null) {
    headers["RateLimit-Limit"] = String(usage.limit);
    headers["RateLimit-Remaining"] = String(usage.remaining);
    headers["RateLimit-Reset"] = String(
      Math.max(0, Math.ceil(new Date(usage.resetAt).getTime() / 1000)),
    );
  }
  return headers;
}

export async function GET(request: Request, context: Context) {
  const jobId = jobIdSchema.safeParse((await context.params).id);
  if (!jobId.success)
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "The workspace is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client, request);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const job = await getJobDetail(user, jobId.data, client);
    if (!job)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    const usage = await getAiUsage(client, user);
    const cv = await client.query<{ revision: number }>(
      "SELECT revision FROM candidate_cvs WHERE user_id=$1",
      [user.id],
    );
    if (!cv.rowCount)
      return NextResponse.json(
        { cvAvailable: false, review: null, stale: false, usage },
        { headers: usageHeaders(usage) },
      );
    const latest = await client.query<{
      id: string;
      result: unknown;
      model: string;
      createdAt: string;
      cvRevision: number;
      jobHash: string;
    }>(
      `SELECT id,result,model_identifier AS model,created_at AS "createdAt",cv_revision AS "cvRevision",job_hash AS "jobHash"
       FROM job_cv_reviews WHERE user_id=$1 AND job_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [user.id, jobId.data],
    );
    const row = latest.rows[0];
    const stale = Boolean(
      row &&
      (row.cvRevision !== cv.rows[0].revision ||
        row.jobHash !== jobCvHash(job)),
    );
    return NextResponse.json(
      {
        cvAvailable: true,
        review: stale ? null : row || null,
        stale,
        usage,
      },
      { headers: usageHeaders(usage) },
    );
  } catch (error) {
    console.error("CV job review read failed", error);
    return NextResponse.json(
      { error: "The job review could not be loaded." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request, context: Context) {
  const jobId = jobIdSchema.safeParse((await context.params).id);
  if (!jobId.success)
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  let user;
  try {
    user = await authorizeWrite(request);
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    if (message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return NextResponse.json(
      { error: "The workspace is temporarily unavailable." },
      { status: 503 },
    );
  }
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "The workspace is temporarily unavailable." },
      { status: 503 },
    );
  let reservationId: string | null = null;
  let workspaceReserved = false;
  try {
    const job = await getJobDetail(user, jobId.data, client);
    if (!job)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    const cvRow = await client.query<{ profile: unknown; revision: number }>(
      "SELECT profile,revision FROM candidate_cvs WHERE user_id=$1",
      [user.id],
    );
    if (!cvRow.rowCount)
      return NextResponse.json(
        { error: "Save your reviewed CV before analyzing a job." },
        { status: 409 },
      );
    const parsedCv = cvProfileSchema.safeParse(cvRow.rows[0].profile);
    if (!parsedCv.success)
      return NextResponse.json(
        { error: "The saved CV needs to be reviewed again." },
        { status: 409 },
      );
    const cv = parsedCv.data;
    const revision = cvRow.rows[0].revision;
    const hash = jobCvHash(job);
    const existing = await client.query(
      `SELECT id,result,model_identifier AS model,created_at AS "createdAt"
       FROM job_cv_reviews WHERE user_id=$1 AND job_id=$2 AND cv_revision=$3 AND job_hash=$4`,
      [user.id, jobId.data, revision, hash],
    );
    if (existing.rowCount) {
      await completeWorkspaceAiRequest(client, { cacheHit: true });
      const usage = await getAiUsage(client, user);
      return NextResponse.json(
        { review: existing.rows[0], cached: true, usage },
        { headers: usageHeaders(usage) },
      );
    }
    const config = jevConfig();
    if (!config.apiKey)
      return NextResponse.json(
        { error: "JEV review is not configured yet." },
        { status: 503 },
      );
    const reservation = await reserveAiJobAnalysis(client, user, jobId.data);
    reservationId = reservation.reservationId;
    if (!reservation.usage.unlimited && !reservationId) {
      const retryAfter = Math.max(
        1,
        Math.ceil(
          (new Date(reservation.usage.resetAt).getTime() - Date.now()) / 1000,
        ),
      );
      return NextResponse.json(
        {
          error: `Daily AI analysis limit reached. Your allowance resets at ${new Date(
            reservation.usage.resetAt,
          ).toLocaleTimeString("en-LK", {
            timeZone: "Asia/Colombo",
            hour: "numeric",
            minute: "2-digit",
          })}.`,
          usage: reservation.usage,
        },
        {
          status: 429,
          headers: {
            ...usageHeaders(reservation.usage),
            "Retry-After": String(retryAfter),
          },
        },
      );
    }
    const workspaceReservation = await reserveWorkspaceAiRequest(client);
    if (!workspaceReservation.allowed) {
      await completeAiJobAnalysis(client, reservationId, false);
      reservationId = null;
      return NextResponse.json(
        {
          error: workspaceReservation.reason,
          usage: reservation.usage,
        },
        { status: 429, headers: usageHeaders(reservation.usage) },
      );
    }
    workspaceReserved = true;
    const analyzed = await reviewJobAgainstCv(createJevClient(config), job, cv);
    await completeWorkspaceAiRequest(client, {
      inputTokens: analyzed.usage.input_tokens,
      outputTokens: analyzed.usage.output_tokens,
    });
    workspaceReserved = false;
    const currentJob = await getJobDetail(user, jobId.data, client);
    if (!currentJob || jobCvHash(currentJob) !== hash) {
      await completeAiJobAnalysis(client, reservationId, false);
      reservationId = null;
      return NextResponse.json(
        { error: "This listing changed during review. Try again." },
        { status: 409 },
      );
    }
    const inserted = await client.query(
      `INSERT INTO job_cv_reviews(user_id,job_id,cv_revision,job_hash,result,model_identifier)
       SELECT $1,$2,$3,$4,$5::jsonb,$6 FROM candidate_cvs WHERE user_id=$1 AND revision=$3
       ON CONFLICT(user_id,job_id,cv_revision,job_hash) DO NOTHING
       RETURNING id,result,model_identifier AS model,created_at AS "createdAt"`,
      [
        user.id,
        jobId.data,
        revision,
        hash,
        JSON.stringify(analyzed.result),
        analyzed.model,
      ],
    );
    if (!inserted.rowCount) {
      await completeAiJobAnalysis(client, reservationId, false);
      reservationId = null;
      return NextResponse.json(
        { error: "Your CV changed during review. Try again." },
        { status: 409 },
      );
    }
    await completeAiJobAnalysis(client, reservationId, true);
    reservationId = null;
    const usage = await getAiUsage(client, user);
    return NextResponse.json(
      { review: inserted.rows[0], cached: false, usage },
      { headers: usageHeaders(usage) },
    );
  } catch (error) {
    await completeAiJobAnalysis(client, reservationId, false).catch(() => {});
    if (workspaceReserved)
      await completeWorkspaceAiRequest(client, { failed: true }).catch(
        () => {},
      );
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 0;
    if (status === 402 || status === 429)
      await pauseWorkspaceAi(
        client,
        status === 402
          ? "AI provider credit is unavailable. Requests are paused to prevent paid overage."
          : "AI provider quota was reached. Requests are paused until the owner resumes them.",
      ).catch(() => {});
    console.error(
      "CV job review failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { error: "JEV could not review this job right now. Try again later." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

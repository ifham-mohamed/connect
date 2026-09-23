import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWrite, type AuthUser } from "@/lib/auth";
import { withDatabaseRetry } from "@/lib/db";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const jobIdSchema = z.string().uuid();
const bodySchema = z.object({
  text: z.string().trim().min(40).max(30_000),
  confidence: z.number().min(0).max(100).nullable().optional(),
});

type Context = { params: Promise<{ id: string }> };

function visibleJobSql(user: AuthUser) {
  return user.role === "owner"
    ? "TRUE"
    : `(
        personal_state.job_id IS NOT NULL OR EXISTS (
          SELECT 1 FROM monitor_matches visible_match
          JOIN monitors visible_monitor ON visible_monitor.id=visible_match.monitor_id
          WHERE visible_match.job_id=j.id
            AND visible_monitor.user_id=$1
            AND visible_monitor.enabled
        )
      )`;
}

export async function POST(request: Request, context: Context) {
  try {
    const jobId = jobIdSchema.safeParse((await context.params).id);
    if (!jobId.success)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const user = await authorizeWrite(request);
    const body = bodySchema.parse(await readJsonBody(request, 32_000));
    const saved = await withDatabaseRetry((client) =>
      client.query<{
        text: string;
        confidence: number | null;
        savedAt: string;
      }>(
        `INSERT INTO job_user_states(
           user_id,job_id,extracted_description,extracted_description_confidence,extracted_at
         )
         SELECT $1,j.id,$3,$4,now()
         FROM jobs j
         LEFT JOIN job_user_states personal_state
           ON personal_state.job_id=j.id AND personal_state.user_id=$1
         WHERE j.id=$2 AND ${visibleJobSql(user)}
         ON CONFLICT(user_id,job_id) DO UPDATE SET
           extracted_description=excluded.extracted_description,
           extracted_description_confidence=excluded.extracted_description_confidence,
           extracted_at=excluded.extracted_at,
           updated_at=now()
         RETURNING extracted_description AS text,
                   extracted_description_confidence AS confidence,
                   extracted_at AS "savedAt"`,
        [user.id, jobId.data, body.text, body.confidence ?? null],
      ),
    );
    const row = saved.rows[0];
    if (!row)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    return imageContextError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const jobId = jobIdSchema.safeParse((await context.params).id);
    if (!jobId.success)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const user = await authorizeWrite(request);
    const cleared = await withDatabaseRetry((client) =>
      client.query<{ visible: boolean }>(
        `WITH visible_job AS (
           SELECT j.id FROM jobs j
           LEFT JOIN job_user_states personal_state
             ON personal_state.job_id=j.id AND personal_state.user_id=$1
           WHERE j.id=$2 AND ${visibleJobSql(user)}
         ), cleared AS (
           UPDATE job_user_states state SET
             extracted_description='',
             extracted_description_confidence=NULL,
             extracted_at=NULL,
             updated_at=now()
           FROM visible_job
           WHERE state.user_id=$1 AND state.job_id=visible_job.id
           RETURNING state.job_id
         )
         SELECT EXISTS(SELECT 1 FROM visible_job) AS visible`,
        [user.id, jobId.data],
      ),
    );
    if (!cleared.rows[0]?.visible)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return imageContextError(error);
  }
}

function imageContextError(error: unknown) {
  const limited = rateLimitResponse(error);
  if (limited) return limited;
  if (error instanceof RequestBodyError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: "Review the extracted text before saving it." },
      { status: 400 },
    );
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED")
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (message === "FORBIDDEN")
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  console.error(
    "Job image context update failed",
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
  );
  return NextResponse.json(
    {
      error:
        "The workspace connection was interrupted. Your reviewed text is still here; try saving again.",
    },
    { status: 503, headers: { "Retry-After": "2" } },
  );
}

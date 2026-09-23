import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWrite, type AuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJobDetail } from "@/lib/repository";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";
import type { PoolClient } from "pg";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(40).max(30_000),
  confidence: z.number().min(0).max(100).nullable().optional(),
});

type ImageContextState =
  | { response: NextResponse }
  | { client: PoolClient; user: AuthUser; job: Job; id: string };

async function context(
  params: Promise<{ id: string }>,
  user: AuthUser,
): Promise<ImageContextState> {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success)
    return {
      response: NextResponse.json({ error: "Job not found." }, { status: 404 }),
    };
  const client = await db().connect();
  const job = await getJobDetail(user, id.data, client);
  if (!job) {
    client.release();
    return {
      response: NextResponse.json({ error: "Job not found." }, { status: 404 }),
    };
  }
  return { client, user, job, id: id.data };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let state: Awaited<ReturnType<typeof context>> | null = null;
  try {
    const user = await authorizeWrite(request);
    state = await context(params, user);
    if (!("client" in state)) return state.response;
    const body = bodySchema.parse(await readJsonBody(request, 32_000));
    await state.client.query(
      `INSERT INTO job_user_states(
         user_id,job_id,extracted_description,extracted_description_confidence,extracted_at
       ) VALUES($1,$2,$3,$4,now())
       ON CONFLICT(user_id,job_id) DO UPDATE SET
         extracted_description=excluded.extracted_description,
         extracted_description_confidence=excluded.extracted_description_confidence,
         extracted_at=excluded.extracted_at,
         updated_at=now()`,
      [state.user.id, state.id, body.text, body.confidence ?? null],
    );
    return NextResponse.json({
      text: body.text,
      confidence: body.confidence ?? null,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return imageContextError(error);
  } finally {
    if (state && "client" in state) state.client.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let state: Awaited<ReturnType<typeof context>> | null = null;
  try {
    const user = await authorizeWrite(request);
    state = await context(params, user);
    if (!("client" in state)) return state.response;
    await state.client.query(
      `UPDATE job_user_states SET extracted_description='',
         extracted_description_confidence=NULL,extracted_at=NULL,updated_at=now()
       WHERE user_id=$1 AND job_id=$2`,
      [state.user.id, state.id],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return imageContextError(error);
  } finally {
    if (state && "client" in state) state.client.release();
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
    error instanceof Error ? error.message : "unknown",
  );
  return NextResponse.json(
    { error: "The extracted job context could not be updated." },
    { status: 503 },
  );
}

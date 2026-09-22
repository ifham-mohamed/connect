import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, originAllowed } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJobDetail } from "@/lib/repository";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().trim().min(40).max(30_000),
  confidence: z.number().min(0).max(100).nullable().optional(),
});

async function context(params: Promise<{ id: string }>) {
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success)
    return {
      response: NextResponse.json({ error: "Job not found." }, { status: 404 }),
    };
  const client = await db().connect();
  const user = await currentUser(client);
  if (!user) {
    client.release();
    return {
      response: NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 },
      ),
    };
  }
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
  if (!originAllowed(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const state = await context(params);
  if ("response" in state) return state.response;
  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { error: "Review the extracted text before saving it." },
        { status: 400 },
      );
    await state.client.query(
      `INSERT INTO job_user_states(
         user_id,job_id,extracted_description,extracted_description_confidence,extracted_at
       ) VALUES($1,$2,$3,$4,now())
       ON CONFLICT(user_id,job_id) DO UPDATE SET
         extracted_description=excluded.extracted_description,
         extracted_description_confidence=excluded.extracted_description_confidence,
         extracted_at=excluded.extracted_at,
         updated_at=now()`,
      [state.user.id, state.id, body.data.text, body.data.confidence ?? null],
    );
    return NextResponse.json({
      text: body.data.text,
      confidence: body.data.confidence ?? null,
      savedAt: new Date().toISOString(),
    });
  } finally {
    state.client.release();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!originAllowed(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const state = await context(params);
  if ("response" in state) return state.response;
  try {
    await state.client.query(
      `UPDATE job_user_states SET extracted_description='',
         extracted_description_confidence=NULL,extracted_at=NULL,updated_at=now()
       WHERE user_id=$1 AND job_id=$2`,
      [state.user.id, state.id],
    );
    return NextResponse.json({ ok: true });
  } finally {
    state.client.release();
  }
}

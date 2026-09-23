import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeWrite, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { approvedCvSchema } from "@/lib/cv/schema";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const client = await db().connect();
    try {
      const user = await currentUser(client, request);
      if (!user)
        return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      const result = await client.query(
        `SELECT profile, revision, approved_at AS "approvedAt", updated_at AS "updatedAt"
         FROM candidate_cvs WHERE user_id=$1`,
        [user.id],
      );
      return NextResponse.json(
        { cv: result.rows[0] || null },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("CV read failed", error);
    return NextResponse.json(
      { error: "Your CV could not be loaded." },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authorizeWrite(request);
    const input = approvedCvSchema.parse(await readJsonBody(request, 250_000));
    const result =
      input.baseRevision === 0
        ? await db().query(
            `INSERT INTO candidate_cvs(user_id,profile) VALUES($1,$2)
           ON CONFLICT(user_id) DO NOTHING RETURNING revision,updated_at AS "updatedAt"`,
            [user.id, input.profile],
          )
        : await db().query(
            `UPDATE candidate_cvs SET profile=$2,revision=revision+1,approved_at=now(),updated_at=now()
           WHERE user_id=$1 AND revision=$3 RETURNING revision,updated_at AS "updatedAt"`,
            [user.id, input.profile, input.baseRevision],
          );
    if (!result.rowCount)
      return NextResponse.json(
        { error: "This CV changed in another tab. Reload before saving." },
        { status: 409 },
      );
    return NextResponse.json(
      { cv: result.rows[0] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return cvWriteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authorizeWrite(request);
    await db().query("DELETE FROM candidate_cvs WHERE user_id=$1", [user.id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return cvWriteError(error);
  }
}

function cvWriteError(error: unknown) {
  const limited = rateLimitResponse(error);
  if (limited) return limited;
  if (error instanceof RequestBodyError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid CV." },
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
  console.error("CV update failed", error);
  return NextResponse.json(
    { error: "Your CV could not be saved." },
    { status: 503 },
  );
}

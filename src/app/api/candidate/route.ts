import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const profileInput = z.object({
  consent: z.literal(true),
  skills: z
    .array(z.string().trim().min(2).max(60))
    .max(30)
    .refine(
      (skills) =>
        new Set(skills.map((skill) => skill.toLowerCase())).size ===
        skills.length,
      "Remove duplicate skills.",
    ),
  evidenceSummary: z.string().trim().max(2000),
});

export async function GET(request: Request) {
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "The database is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const profile = await client.query(
      `SELECT skills,evidence_summary AS "evidenceSummary",consented_at AS "consentedAt",updated_at AS "updatedAt"
       FROM candidate_profiles WHERE user_id=$1`,
      [user.id],
    );
    if (new URL(request.url).searchParams.has("export")) {
      const cv = await client.query(
        `SELECT profile,approved_at AS "approvedAt",updated_at AS "updatedAt" FROM candidate_cvs WHERE user_id=$1`,
        [user.id],
      );
      const reviews = await client.query(
        `SELECT r.result,r.model_identifier AS model,r.created_at AS "createdAt",j.title AS "jobTitle",j.company
         FROM job_cv_reviews r JOIN jobs j ON j.id=r.job_id
         WHERE r.user_id=$1 ORDER BY r.created_at DESC`,
        [user.id],
      );
      const states = await client.query(
        `SELECT j.title,j.company,j.url,s.status,s.reviewed_at AS "reviewedAt",
                s.applied_at AS "appliedAt",s.application_note AS "applicationNote",s.updated_at AS "updatedAt"
                ,s.extracted_description AS "extractedDescription",
                s.extracted_description_confidence AS "extractedDescriptionConfidence",
                s.extracted_at AS "extractedAt"
         FROM job_user_states s JOIN jobs j ON j.id=s.job_id WHERE s.user_id=$1 ORDER BY s.updated_at DESC`,
        [user.id],
      );
      return new Response(
        JSON.stringify(
          {
            profile: profile.rows[0] || null,
            cv: cv.rows[0] || null,
            jobCvReviews: reviews.rows,
            applications: states.rows,
          },
          null,
          2,
        ),
        {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition":
              'attachment; filename="jobradar-personal-data.json"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return NextResponse.json(
      { profile: profile.rows[0] || null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Candidate profile read failed", error);
    return NextResponse.json(
      { error: "The profile could not be loaded." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  try {
    const user = await authorizeWrite(request);
    const input = profileInput.parse(await readJsonBody(request, 12_000));
    await db().query(
      `INSERT INTO candidate_profiles(user_id,skills,evidence_summary,consented_at)
       VALUES($1,$2,$3,now())
       ON CONFLICT(user_id) DO UPDATE SET skills=excluded.skills,
         evidence_summary=excluded.evidence_summary,updated_at=now()`,
      [user.id, input.skills, input.evidenceSummary],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return candidateError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authorizeWrite(request);
    await db().query("DELETE FROM candidate_profiles WHERE user_id=$1", [
      user.id,
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return candidateError(error);
  }
}

function candidateError(error: unknown) {
  const limited = rateLimitResponse(error);
  if (limited) return limited;
  if (error instanceof RequestBodyError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid profile." },
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
  console.error("Candidate profile update failed", error);
  return NextResponse.json(
    { error: "The profile could not be updated." },
    { status: 503 },
  );
}

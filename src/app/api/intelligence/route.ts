import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntelligenceHealth } from "@/lib/intelligence/report";
import { rebuildMatches, rebuildMatchesForJobs } from "@/lib/sync";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "The workspace database is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (user.role !== "owner")
      return NextResponse.json(
        { error: "Only the workspace owner can view JEV health." },
        { status: 403 },
      );
    const [health, rules, corrections, reviewedJobs, pendingJobs] =
      await Promise.all([
        getIntelligenceHealth(client),
        client.query(`SELECT source_kind AS "sourceKind",field,min_confidence AS "minConfidence",enabled,rationale,updated_at AS "updatedAt"
        FROM jev_rollout_rules ORDER BY source_kind,field`),
        client.query(`SELECT c.id,c.job_id AS "jobId",j.title,c.field,c.value,c.reason,c.created_at AS "createdAt"
        FROM jev_corrections c JOIN jobs j ON j.id=c.job_id ORDER BY c.created_at DESC LIMIT 50`),
        client.query(
          `SELECT DISTINCT ON (r.job_id) r.job_id AS "jobId",j.title,j.company,s.name AS source,
                r.result->>'overallScore' AS "overallScore",r.model_identifier AS model,
                r.created_at AS "createdAt"
           FROM job_cv_reviews r
           JOIN jobs j ON j.id=r.job_id
           JOIN sources s ON s.id=j.source_id
          WHERE r.user_id=$1
          ORDER BY r.job_id,r.created_at DESC`,
          [user.id],
        ),
        client.query(
          `SELECT DISTINCT j.id AS "jobId",j.title,j.company,s.name AS source,j.published_at AS "publishedAt"
           FROM monitor_matches mm
           JOIN monitors m ON m.id=mm.monitor_id AND m.user_id=$1 AND m.enabled
           JOIN jobs j ON j.id=mm.job_id AND j.active
           JOIN sources s ON s.id=j.source_id
          WHERE NOT EXISTS (
            SELECT 1 FROM job_cv_reviews review WHERE review.user_id=$1 AND review.job_id=j.id
          )
          ORDER BY j.published_at DESC NULLS LAST
          LIMIT 12`,
          [user.id],
        ),
      ]);
    return NextResponse.json({
      ...health,
      rules: rules.rows,
      corrections: corrections.rows,
      reviewedJobs: reviewedJobs.rows
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 12),
      pendingJobs: pendingJobs.rows,
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    console.error("JEV health read failed", error);
    return NextResponse.json(
      { error: "JEV health is temporarily unavailable." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

const ruleInput = z
  .object({
    action: z.literal("rule-save"),
    sourceKind: z.enum([
      "itpro",
      "topjobs",
      "xpressjobs",
      "jobeka",
      "rooster",
      "neojobs",
      "jobster",
      "remotive",
      "arbeitnow",
      "greenhouse",
      "lever",
    ]),
    field: z.enum([
      "content_quality",
      "technology_relevance",
      "work_arrangement",
      "career_stage",
    ]),
    minConfidence: z.number().min(0.5).max(1),
    enabled: z.boolean(),
    rationale: z.string().trim().max(1000),
  })
  .refine((value) => !value.enabled || value.rationale.length >= 20, {
    message: "Explain the reviewed evidence before enabling this rule.",
  });
const correctionInput = z
  .object({
    action: z.literal("correction-add"),
    jobId: z.string().uuid(),
    field: z.enum([
      "career_stage",
      "work_arrangement",
      "content_quality",
      "technology_relevance",
    ]),
    value: z.string().max(30),
    reason: z.string().trim().min(8).max(500),
  })
  .refine(
    (value) =>
      ({
        career_stage: ["internship", "entry", "mid", "senior", "other"],
        work_arrangement: ["onsite", "hybrid", "remote", "unclear"],
        content_quality: ["usable", "sparse", "malformed", "non_job"],
        technology_relevance: ["technology", "non_technology"],
      })[value.field].includes(value.value),
    { message: "The correction value is invalid for this field." },
  );

export async function POST(request: Request) {
  try {
    const user = await authorizeWrite(request, "owner");
    const input = z
      .union([ruleInput, correctionInput])
      .parse(await readJsonBody(request, 12_000));
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(741210)");
      if (input.action === "rule-save") {
        await client.query(
          `INSERT INTO jev_rollout_rules(source_kind,field,min_confidence,enabled,rationale,updated_by)
          VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT(source_kind,field) DO UPDATE SET min_confidence=excluded.min_confidence,
          enabled=excluded.enabled,rationale=excluded.rationale,updated_by=excluded.updated_by,updated_at=now()`,
          [
            input.sourceKind,
            input.field,
            input.minConfidence,
            input.enabled,
            input.rationale,
            user.id,
          ],
        );
        if (process.env.JEV_MODE === "assisted") await rebuildMatches(client);
      } else {
        await client.query(
          `INSERT INTO jev_corrections(job_id,field,value,reason,created_by)
          VALUES($1,$2,$3,$4,$5)`,
          [input.jobId, input.field, input.value, input.reason, user.id],
        );
        if (process.env.JEV_MODE === "assisted")
          await rebuildMatchesForJobs(client, [input.jobId]);
      }
      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
        { error: error.issues[0]?.message || "Invalid input." },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (message === "OWNER_REQUIRED" || message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Owner access and same-origin request are required." },
        { status: 403 },
      );
    console.error("JEV policy update failed", error);
    return NextResponse.json(
      { error: "The JEV policy could not be saved." },
      { status: 503 },
    );
  }
}

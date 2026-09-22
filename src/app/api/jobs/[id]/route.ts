import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJobDetail } from "@/lib/repository";
import { containsKeyword } from "@/lib/matching";
import {
  requirementDescriptionHash,
  requirementText,
} from "@/lib/intelligence/requirements";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success)
    return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const client = await db()
    .connect()
    .catch((error) => {
      console.error("Job detail connection failed", error);
      return null;
    });
  if (!client)
    return NextResponse.json(
      { error: "The workspace database is temporarily unavailable." },
      { status: 503 },
    );

  try {
    const user = await currentUser(client);
    if (!user)
      return NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 },
      );
    const job = await getJobDetail(user, parsed.data, client);
    if (!job)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    const text = requirementText(job.description);
    const [requirements, profile] = await Promise.all([
      client.query<{
        evidence: string;
        startOffset: number;
        endOffset: number;
        category: string;
        importance: string;
        groupKind: string;
        confidence: number;
      }>(
        `SELECT evidence,start_offset AS "startOffset",end_offset AS "endOffset",category,importance,group_kind AS "groupKind",confidence
         FROM job_requirements WHERE job_id=$1 AND description_hash=$2
         ORDER BY start_offset LIMIT 12`,
        [parsed.data, requirementDescriptionHash(text)],
      ),
      client.query<{ skills: string[] }>(
        "SELECT skills FROM candidate_profiles WHERE user_id=$1",
        [user.id],
      ),
    ]);
    const skills = profile.rows[0]?.skills || [];
    const supported = requirements.rows.filter(
      (row) => text.slice(row.startOffset, row.endOffset) === row.evidence,
    );
    return NextResponse.json({
      job: {
        ...job,
        requirements: supported,
        profileSkillMatches: skills.filter((skill) =>
          supported.some(
            (row) =>
              row.category === "skill" && containsKeyword(row.evidence, skill),
          ),
        ),
      },
    });
  } catch (error) {
    console.error("Job detail read failed", error);
    return NextResponse.json(
      { error: "The opportunity could not be loaded." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

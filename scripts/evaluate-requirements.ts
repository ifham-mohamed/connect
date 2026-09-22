import { db } from "../src/lib/db";
import { createJevClient } from "../src/lib/jev/client";
import { jevConfig } from "../src/lib/jev/config";
import {
  extractRequirementCandidates,
  labelRequirementsWithJev,
  REQUIREMENT_QUESTION_VERSION,
  requirementDescriptionHash,
  requirementText,
} from "../src/lib/intelligence/requirements";

const argument = process.argv.find((value) => value.startsWith("--limit="));
const limit = argument ? Number(argument.slice(8)) : 0;
if (!Number.isInteger(limit) || limit < 1 || limit > 25)
  throw new Error("Pass --limit=1..25 for controlled requirement evaluation.");
const config = jevConfig();
const model = createJevClient(config);
const pool = db();
try {
  const jobs = await pool.query<{
    id: string;
    title: string;
    description: string;
  }>(
    `SELECT j.id,j.title,j.description FROM jobs j
      JOIN job_intelligence_profiles p ON p.job_id=j.id
      WHERE j.active AND length(j.description)>40 AND NOT p.needs_review
      ORDER BY COALESCE(j.published_at,j.first_seen_at) DESC LIMIT $1`,
    [limit],
  );
  const summary = {
    considered: jobs.rows.length,
    labeled: 0,
    candidates: 0,
    skipped: 0,
  };
  for (const job of jobs.rows) {
    const text = requirementText(job.description);
    const hash = requirementDescriptionHash(text);
    const existing = await pool.query(
      `SELECT 1 FROM job_requirements WHERE job_id=$1 AND description_hash=$2 AND question_set_version=$3 LIMIT 1`,
      [job.id, hash, REQUIREMENT_QUESTION_VERSION],
    );
    if (existing.rowCount) {
      summary.skipped++;
      continue;
    }
    const candidates = extractRequirementCandidates(text);
    if (!candidates.length) {
      summary.skipped++;
      continue;
    }
    const result = await labelRequirementsWithJev(
      model,
      job.title,
      text,
      candidates,
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const item of result.requirements) {
        if (text.slice(item.startOffset, item.endOffset) !== item.evidence)
          throw new Error("Requirement evidence changed before saving.");
        await client.query(
          `INSERT INTO job_requirements(job_id,description_hash,start_offset,end_offset,evidence,category,importance,group_kind,confidence,model_identifier,question_set_version)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT(job_id,description_hash,start_offset,end_offset,question_set_version) DO NOTHING`,
          [
            job.id,
            hash,
            item.startOffset,
            item.endOffset,
            item.evidence,
            item.category,
            item.importance,
            item.groupKind,
            item.confidence,
            result.model,
            REQUIREMENT_QUESTION_VERSION,
          ],
        );
      }
      await client.query("COMMIT");
      summary.labeled++;
      summary.candidates += result.requirements.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(JSON.stringify(summary));
} finally {
  await pool.end();
}

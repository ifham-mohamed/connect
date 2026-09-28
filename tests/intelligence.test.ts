import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { validateJobClassification } from "../src/lib/jev/contract";
import {
  backfillJobIntelligence,
  queueJobsForIntelligence,
} from "../src/lib/intelligence/queue";
import { getIntelligenceHealth } from "../src/lib/intelligence/report";
import { processIntelligenceBatch } from "../src/lib/intelligence/worker";

const database = new PGlite();
const client = {
  query: (text: string, params?: unknown[]) => database.query(text, params),
} as unknown as PoolClient;

function validResponse(stage: "entry" | "senior" = "entry") {
  const distribution = (values: string[], selected: string) =>
    Object.fromEntries(
      values.map((value) => [value, value === selected ? 1 : 0]),
    );
  const roles = [
    "software",
    "frontend",
    "backend",
    "full_stack",
    "data",
    "infrastructure",
    "security",
    "qa",
    "design",
    "product",
    "support",
    "other",
  ];
  const stages = ["internship", "entry", "mid", "senior", "unclear"];
  const modes = ["onsite", "hybrid", "remote", "unclear"];
  const qualities = ["usable", "sparse", "malformed", "non_job"];
  return validateJobClassification({
    model: "jev-test",
    answers: {
      isTechnologyRole: { type: "noul", noul: 1 },
      roleFamily: {
        type: "choice",
        choice: "software",
        confidence: 1,
        probabilities: distribution(roles, "software"),
      },
      careerStage: {
        type: "choice",
        choice: stage,
        confidence: 1,
        probabilities: distribution(stages, stage),
      },
      workArrangement: {
        type: "choice",
        choice: "onsite",
        confidence: 1,
        probabilities: distribution(modes, "onsite"),
      },
      contentQuality: {
        type: "choice",
        choice: "usable",
        confidence: 1,
        probabilities: distribution(qualities, "usable"),
      },
    },
    usage: { input_tokens: 120, output_tokens: 30 },
  });
}

beforeAll(async () => {
  const migrations = [
    "001_initial",
    "002_source_kinds",
    "003_role_monitors",
    "004_sri_lanka_sources",
    "005_location_monitors",
    "006_linkedin_search_monitors",
    "007_user_auth",
    "008_personal_onboarding",
    "009_personal_job_states",
    "010_run_job_results",
    "011_run_result_backfill",
    "012_incremental_matching",
    "013_experience_matching",
    "014_career_stages_and_remove_devjobs",
    "015_distinct_early_career_and_location_coverage",
    "016_location_work_modes_and_numbered_levels",
    "017_worldwide_remote_matching",
    "018_job_intelligence",
    "019_assisted_matching",
    "020_requirement_evidence",
    "021_candidate_workspace",
    "022_assisted_corrections",
    "023_assisted_rule_lookup",
    "024_candidate_cv",
    "025_job_cv_reviews",
    "026_private_image_context",
    "027_itpro_category_sources",
    "028_security_audit",
    "029_ai_usage_limits",
    "030_request_rate_limits",
    "031_scaling_foundation",
    "032_cost_controls",
    "033_source_observability",
    "034_role_title_aliases",
    "035_unspecified_stage_compatibility",
    "036_user_jev_api_keys",
  ];
  for (const migration of migrations)
    await database.exec(
      await readFile(
        new URL(`../db/${migration}.sql`, import.meta.url),
        "utf8",
      ),
    );
  await database.query(
    "UPDATE ai_workspace_budget SET background_enabled=true,monthly_request_limit=1000,monthly_token_limit=10000000,paused_reason=NULL",
  );
});

afterAll(async () => database.close());

describe("JEV queue and shadow persistence", () => {
  it("uses reviewed stages only when enabled and preserves explicit senior exclusions", async () => {
    const inserted = await database.query<{ id: string }>(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url)
       SELECT id,'jev-assisted-test','Software Engineer','Acme','Colombo','https://example.com/assisted'
       FROM sources WHERE kind='itpro' LIMIT 1 RETURNING id`,
    );
    const jobId = inserted.rows[0].id;
    await queueJobsForIntelligence(client, [jobId]);
    const result = await processIntelligenceBatch(
      client,
      async () => ({
        result: validResponse(),
        requestId: undefined,
        latencyMs: 10,
      }),
      { batchSize: 1, maxAttempts: 3 },
      "assisted-test",
    );
    expect(result.succeeded).toBe(1);
    const matched = async (title: string) =>
      (
        await database.query<{ allowed: boolean }>(
          `SELECT jobradar_assisted_match($1,'itpro',$2,'Colombo',false,ARRAY['onsite']::text[],'entry') AS allowed`,
          [jobId, title],
        )
      ).rows[0].allowed;
    expect(await matched("Software Engineer")).toBe(true);
    await database.query(`INSERT INTO jev_rollout_rules(source_kind,field,min_confidence,enabled,rationale)
      VALUES('itpro','career_stage',0.9,true,'Approved controlled test for ambiguous stages.')`);
    expect(await matched("Software Engineer")).toBe(true);
    expect(await matched("Senior Software Engineer")).toBe(false);
    await database.query(
      `INSERT INTO jev_corrections(job_id,field,value,reason)
      VALUES($1,'career_stage','mid','Owner reviewed title')`,
      [jobId],
    );
    expect(await matched("Software Engineer")).toBe(false);
    expect(await matched("Senior Software Engineer")).toBe(false);
    await database.query(
      "UPDATE jev_rollout_rules SET enabled=false WHERE source_kind='itpro' AND field='career_stage'",
    );
    expect(await matched("Software Engineer")).toBe(true);
  });
  it("queues each content version once and processes it with a fake classifier", async () => {
    const inserted = await database.query<{ id: string }>(
      `INSERT INTO jobs(source_id,external_id,title,company,location,employment_type,tags,description,url)
       SELECT id,'jev-test-1','Graduate Software Engineer','Acme','Colombo','Full time',ARRAY['software'],'Build applications.','https://example.com/job'
       FROM sources WHERE kind='itpro' LIMIT 1 RETURNING id`,
    );
    const jobId = inserted.rows[0].id;
    expect(await queueJobsForIntelligence(client, [jobId])).toBe(1);
    expect(await queueJobsForIntelligence(client, [jobId])).toBe(0);

    const summary = await processIntelligenceBatch(
      client,
      async () => ({
        result: validResponse(),
        requestId: "request-test",
        latencyMs: 12,
      }),
      { batchSize: 5, maxAttempts: 3 },
      "test-worker",
    );
    expect(summary).toEqual({
      claimed: 1,
      succeeded: 1,
      retrying: 0,
      dead: 0,
      stale: 0,
    });
    const profile = await database.query<{
      careerStage: string;
      policyStatus: string;
    }>(
      `SELECT career_stage AS "careerStage",policy_status AS "policyStatus"
       FROM job_intelligence_profiles WHERE job_id=$1`,
      [jobId],
    );
    expect(profile.rows[0]).toEqual({
      careerStage: "entry",
      policyStatus: "shadow_only",
    });

    await database.query(
      "UPDATE jobs SET title='Senior Software Engineer' WHERE id=$1",
      [jobId],
    );
    expect(await queueJobsForIntelligence(client, [jobId])).toBe(1);
    const conflict = await processIntelligenceBatch(
      client,
      async () => ({
        result: validResponse(),
        requestId: undefined,
        latencyMs: 8,
      }),
      { batchSize: 5, maxAttempts: 3 },
      "test-worker",
    );
    expect(conflict.succeeded).toBe(1);
    const reviewed = await database.query<{ needsReview: boolean }>(
      `SELECT needs_review AS "needsReview" FROM job_intelligence_profiles WHERE job_id=$1`,
      [jobId],
    );
    expect(reviewed.rows[0].needsReview).toBe(true);
  });

  it("retries failures without storing raw error text", async () => {
    const inserted = await database.query<{ id: string }>(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url)
       SELECT id,'jev-test-2','Frontend Developer','Acme','Colombo','https://example.com/job-2'
       FROM sources WHERE kind='itpro' LIMIT 1 RETURNING id`,
    );
    await queueJobsForIntelligence(client, [inserted.rows[0].id]);
    const summary = await processIntelligenceBatch(
      client,
      async () => {
        throw new Error("private provider detail");
      },
      { batchSize: 5, maxAttempts: 3 },
      "test-worker",
    );
    expect(summary.retrying).toBe(1);
    const queue = await database.query<{ status: string; code: string }>(
      `SELECT status,last_error_code AS code FROM job_intelligence_queue
       WHERE job_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [inserted.rows[0].id],
    );
    expect(queue.rows[0]).toEqual({ status: "retrying", code: "unexpected" });
  });

  it("backfills idempotently and reports owner-safe shadow health", async () => {
    expect(await backfillJobIntelligence(client, 100)).toBe(0);
    const health = await getIntelligenceHealth(client);
    expect(health.evaluations.total).toBe(3);
    expect(health.evaluations.review).toBe(1);
    expect(health.sources.some((source) => source.evaluated === 3)).toBe(true);
  });
});

import { readFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { databaseError } from "../src/lib/database-error";
import type { PoolClient } from "pg";
let pool: ReturnType<typeof db> | undefined;
let client: PoolClient | undefined;
try {
  pool = db();
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(741211)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
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
  ];
  for (const name of migrations) {
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name=$1",
      [name],
    );
    if (applied.rowCount) continue;
    await client.query(
      await readFile(new URL(`../db/${name}.sql`, import.meta.url), "utf8"),
    );
    await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
      name,
    ]);
  }
  await client.query("COMMIT");
  console.log("Database is ready.");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error(pool ? databaseError(error) : (error as Error).message);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool?.end();
}

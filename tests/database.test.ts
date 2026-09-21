import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { PoolClient } from "pg";
const database = new PGlite();
vi.mock("../src/lib/db", () => ({
  db: () => ({
    query: async (text: string, params: unknown[]) =>
      database.query(text, params),
  }),
}));
const { rebuildMatches } = await import("../src/lib/sync");
const { jobSelect, sourceSelect } = await import("../src/lib/repository");
const client = {
  query: (text: string, params?: unknown[]) => database.query(text, params),
} as unknown as PoolClient;
beforeAll(async () => {
  await database.exec(
    await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/007_user_auth.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/008_personal_onboarding.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/009_personal_job_states.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/010_run_job_results.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/011_run_result_backfill.sql", import.meta.url), "utf8"),
  );
});
afterAll(async () => {
  await database.close();
});
describe("PostgreSQL schema and matching integration", () => {
  it("matches literal skill names consistently with the frontend", async () => {
    const result = await database.query<{
      ui: boolean;
      cpp: boolean;
      next: boolean;
    }>(
      `SELECT jobradar_keyword_match('Build software','UI') AS ui,jobradar_keyword_match('C++ engineer','C++') AS cpp,jobradar_keyword_match('Next.js developer','Next.js') AS next`,
    );
    expect(result.rows[0]).toEqual({ ui: false, cpp: true, next: true });
  });
  it("migrates and seeds Sri Lankan and remote sources", async () => {
    const sources = await database.query<{ name: string }>(sourceSelect);
    expect(sources.rows.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        "ITPro.lk",
        "ITPro Software Engineering",
        "TopJobs Software Development",
        "JobEka IT Software & Design",
        "Remotive",
        "Dijital Team",
      ]),
    );
  });
  it("retains first-seen dates and saved state when a listing is imported again", async () => {
    const source = await database.query<{ id: string }>(
      "SELECT id FROM sources WHERE kind='itpro'",
    );
    const values = [
      source.rows[0].id,
      "test-1",
      "Software Engineer",
      "Acme",
      "Colombo, Sri Lanka",
      "https://itpro.lk/job/1/",
    ];
    await database.query(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url,status) VALUES($1,$2,$3,$4,$5,$6,'saved')`,
      values,
    );
    const first = await database.query<{ first_seen_at: Date }>(
      "SELECT first_seen_at FROM jobs",
    );
    await database.query(
      `INSERT INTO jobs(source_id,external_id,title,company,location,url) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(source_id,external_id) DO UPDATE SET title=excluded.title,last_seen_at=now()`,
      values,
    );
    const result = await database.query<{
      status: string;
      first_seen_at: Date;
    }>(`SELECT status,first_seen_at FROM jobs`);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe("saved");
    expect(result.rows[0].first_seen_at).toEqual(first.rows[0].first_seen_at);
  });
  it("matches seeded role monitors and refreshes matches after a pause", async () => {
    await rebuildMatches(client);
    const result = await database.query<{ matchedMonitors: string[] }>(
      jobSelect,
    );
    expect(result.rows[0].matchedMonitors).toHaveLength(1);
    await database.query("UPDATE monitors SET enabled=false");
    await rebuildMatches(client);
    const after = await database.query<{ matchedMonitors: string[] }>(
      jobSelect,
    );
    expect(after.rows[0].matchedMonitors).toHaveLength(0);
  });
  it("stores onboarding state and scopes monitors to their user", async () => {
    const user = await database.query<{ id: string }>(
      "INSERT INTO users(name,email,password_hash) VALUES('A User','a@example.com','hash') RETURNING id",
    );
    await database.query("UPDATE monitors SET user_id=$1", [user.rows[0].id]);
    await database.query(
      "UPDATE users SET onboarding_completed_at=now(),preferences=$2::jsonb WHERE id=$1",
      [user.rows[0].id, JSON.stringify({ roles: ["Software Engineer"] })],
    );
    const owned = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM monitors WHERE user_id=$1",
      [user.rows[0].id],
    );
    const profile = await database.query<{ completed: boolean }>(
      'SELECT onboarding_completed_at IS NOT NULL AS completed FROM users WHERE id=$1',
      [user.rows[0].id],
    );
    expect(owned.rows[0].count).toBeGreaterThan(0);
    expect(profile.rows[0].completed).toBe(true);
  });
  it("keeps saved, applied, archived, and reviewed state personal", async () => {
    const users = await database.query<{ id: string }>(
      `INSERT INTO users(name,email,password_hash)
       VALUES('First Person','first@example.com','hash'),('Second Person','second@example.com','hash') RETURNING id`,
    );
    const job = await database.query<{ id: string }>("SELECT id FROM jobs LIMIT 1");
    await database.query(
      `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at)
       VALUES($1,$3,'saved',now()),($2,$3,'archived',NULL)`,
      [users.rows[0].id, users.rows[1].id, job.rows[0].id],
    );
    const states = await database.query<{ userId: string; status: string; reviewed: boolean }>(
      `SELECT user_id AS "userId",status,reviewed_at IS NOT NULL AS reviewed
       FROM job_user_states WHERE job_id=$1 AND user_id=ANY($2::uuid[]) ORDER BY status`,
      [job.rows[0].id, users.rows.map((user) => user.id)],
    );
    expect(states.rows).toEqual([
      { userId: users.rows[1].id, status: "archived", reviewed: false },
      { userId: users.rows[0].id, status: "saved", reviewed: true },
    ]);
  });
  it("enforces unique source identity and valid application status", async () => {
    await expect(
      database.query(
        "INSERT INTO sources(name,kind) VALUES('Duplicate','itpro')",
      ),
    ).rejects.toThrow();
    await expect(
      database.query("UPDATE jobs SET status='unknown'"),
    ).rejects.toThrow();
  });
});

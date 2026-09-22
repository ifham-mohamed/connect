import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { Source } from "../src/lib/types";
const database = new PGlite();
const enabledSeedSources = 11;
let locked = false;
const collectMock = vi.fn(async (source: Source) => [
  {
    sourceId: source.id,
    externalId: "same-id",
    title: "Software Engineer",
    company: "Acme",
    location: "Colombo",
    remote: false,
    employmentType: "Full-time",
    salary: "",
    tags: ["Software Engineering"],
    description: "Build software applications",
    url: "https://itpro.lk/job/1/",
    publishedAt: null,
  },
]);
const query = async (sql: string, params?: unknown[]) => {
  if (sql === "SELECT pg_try_advisory_lock(741209) AS locked") {
    if (locked) return { rows: [{ locked: false }] };
    locked = true;
    return { rows: [{ locked: true }] };
  }
  if (sql === "SELECT pg_advisory_unlock(741209)") {
    locked = false;
    return { rows: [] };
  }
  if (sql === "SELECT pg_advisory_xact_lock(741210)") return { rows: [] };
  return database.query(sql, params);
};
vi.mock("../src/lib/db", () => ({
  db: () => ({ connect: async () => ({ query, release: () => {} }) }),
}));
vi.mock("../src/lib/connectors", () => ({
  collect: (source: Source) => collectMock(source),
}));
const { syncSources } = await import("../src/lib/sync");
beforeAll(async () => {
  await database.exec(
    await readFile(new URL("../db/001_initial.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/007_user_auth.sql", import.meta.url), "utf8"),
  );
  await database.query(
    "INSERT INTO users(name,email,password_hash,role) VALUES('Test Owner','owner@example.com','hash','owner')",
  );
  await database.exec(
    await readFile(new URL("../db/008_personal_onboarding.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/010_run_job_results.sql", import.meta.url), "utf8"),
  );
  await database.exec(
    await readFile(new URL("../db/013_experience_matching.sql", import.meta.url), "utf8"),
  );
  await database.query("UPDATE sources SET enabled=false WHERE kind='lever'");
});
afterAll(async () => {
  await database.close();
});
describe("collector transactions and scheduling", () => {
  it("collects due sources, records runs and avoids a second fetch during cooldown", async () => {
    const first = await syncSources();
    expect(first.results).toHaveLength(enabledSeedSources);
    expect(first.results.every((r) => r.added === 1)).toBe(true);
    const count = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM jobs",
    );
    expect(count.rows[0].count).toBe(enabledSeedSources);
    const matches = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM monitor_matches",
    );
    expect(matches.rows[0].count).toBe(enabledSeedSources);
    const runJobs = await database.query<{ count: number; newCount: number }>(
      `SELECT count(*)::int AS count,count(*) FILTER (WHERE is_new)::int AS "newCount" FROM sync_run_jobs`,
    );
    expect(runJobs.rows[0]).toEqual({ count: enabledSeedSources, newCount: enabledSeedSources });
    const second = await syncSources();
    expect(second.results).toHaveLength(0);
    expect(collectMock).toHaveBeenCalledTimes(enabledSeedSources);
  });
  it("preserves status and identity on re-import and records an isolated source failure", async () => {
    await database.query("UPDATE jobs SET status='saved'");
    await database.query("UPDATE sources SET last_attempt_at=NULL");
    collectMock.mockImplementation(async (source) => {
      if (source.kind === "remotive")
        throw new Error("Source returned HTTP 429");
      return [
        {
          sourceId: source.id,
          externalId: "same-id",
          title: "Updated Software Engineer",
          company: "Acme",
          location: "Colombo",
          remote: false,
          employmentType: "Full-time",
          salary: "",
          tags: ["Software Engineering"],
          description: "Build software applications",
          url: "https://itpro.lk/job/1/",
          publishedAt: null,
        },
      ];
    });
    const result = await syncSources();
    expect(result.results.find((r) => r.source === "ITPro.lk")).toMatchObject({
      status: "success",
      added: 0,
    });
    expect(result.results.find((r) => r.source === "Remotive")?.status).toBe(
      "failed",
    );
    const rows = await database.query<{ status: string }>(
      "SELECT status FROM jobs",
    );
    expect(rows.rows).toHaveLength(enabledSeedSources);
    expect(rows.rows.every((j) => j.status === "saved")).toBe(true);
    const repeated = await database.query<{ isNew: boolean }>(
      `SELECT srj.is_new AS "isNew" FROM sync_run_jobs srj
       JOIN sync_runs run ON run.id=srj.run_id
       JOIN sources source ON source.id=run.source_id
       WHERE source.name='ITPro.lk' ORDER BY run.started_at DESC LIMIT 1`,
    );
    expect(repeated.rows[0].isNew).toBe(false);
    const failed = await database.query<{ status: string; error: string }>(
      "SELECT status,error FROM sync_runs WHERE status='failed'",
    );
    expect(failed.rows[0].error).toContain("429");
    expect((await syncSources()).results).toHaveLength(0);
  });
  it("skips overlapping invocations and recovers interrupted run records", async () => {
    locked = true;
    expect((await syncSources()).busy).toBe(true);
    locked = false;
    await database.query(
      "INSERT INTO sync_runs(source_id) SELECT id FROM sources WHERE kind='itpro'",
    );
    await syncSources();
    const orphan = await database.query<{ status: string }>(
      "SELECT status FROM sync_runs WHERE error LIKE 'Collector interrupted%'",
    );
    expect(orphan.rows[0].status).toBe("failed");
  });
});

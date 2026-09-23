import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import type { PoolClient } from "pg";
import {
  completeAiJobAnalysis,
  getAiUsage,
  reserveAiJobAnalysis,
} from "../src/lib/ai-usage";

const database = new PGlite();
const client = database as unknown as PoolClient;
let memberId = "";
let ownerId = "";
let jobId = "";

beforeAll(async () => {
  for (const migration of [
    "001_initial",
    "007_user_auth",
    "029_ai_usage_limits",
  ])
    await database.exec(
      await readFile(
        new URL(`../db/${migration}.sql`, import.meta.url),
        "utf8",
      ),
    );
  const users = await database.query<{ id: string; role: "owner" | "member" }>(
    `INSERT INTO users(name,email,password_hash,role) VALUES
      ('Owner','usage-owner@example.com','hash','owner'),
      ('Member','usage-member@example.com','hash','member')
     RETURNING id,role`,
  );
  ownerId = users.rows.find((user) => user.role === "owner")!.id;
  memberId = users.rows.find((user) => user.role === "member")!.id;
  const job = await database.query<{ id: string }>(
    `INSERT INTO jobs(source_id,external_id,title,company,location,url)
     SELECT id,'usage-job','Software Engineer','Example','Colombo','https://example.com/job'
     FROM sources LIMIT 1 RETURNING id`,
  );
  jobId = job.rows[0].id;
});

afterAll(async () => database.close());

describe("AI analysis allowance", () => {
  it("allows five successful member analyses and rejects the sixth", async () => {
    for (let index = 0; index < 5; index += 1) {
      const reservation = await reserveAiJobAnalysis(
        client,
        { id: memberId, role: "member" },
        jobId,
      );
      expect(reservation.reservationId).toBeTruthy();
      await completeAiJobAnalysis(client, reservation.reservationId, true);
    }
    const blocked = await reserveAiJobAnalysis(
      client,
      { id: memberId, role: "member" },
      jobId,
    );
    expect(blocked.reservationId).toBeNull();
    expect(blocked.usage).toMatchObject({ limit: 5, used: 5, remaining: 0 });
  });

  it("does not consume member allowance when an analysis fails", async () => {
    await database.query("DELETE FROM ai_job_analysis_usage WHERE user_id=$1", [
      memberId,
    ]);
    const first = await reserveAiJobAnalysis(
      client,
      { id: memberId, role: "member" },
      jobId,
    );
    await completeAiJobAnalysis(client, first.reservationId, false);
    const usage = await getAiUsage(client, { id: memberId, role: "member" });
    expect(usage).toMatchObject({ used: 0, pending: 0, remaining: 5 });
  });

  it("keeps the owner unlimited", async () => {
    const reservation = await reserveAiJobAnalysis(
      client,
      { id: ownerId, role: "owner" },
      jobId,
    );
    expect(reservation.reservationId).toBeNull();
    expect(reservation.usage).toMatchObject({
      unlimited: true,
      limit: null,
      remaining: null,
    });
  });

  it("uses the owner-configured member allowance", async () => {
    await database.query(
      "UPDATE ai_usage_policy SET member_daily_job_analysis_limit=7",
    );
    const usage = await getAiUsage(client, { id: memberId, role: "member" });
    expect(usage).toMatchObject({ memberLimit: 7, limit: 7, remaining: 7 });
  });
});

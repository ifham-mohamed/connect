import { performance } from "node:perf_hooks";
import type { PoolClient } from "pg";
import { workerDb } from "../src/lib/db";
import { listJobs, workspaceSummary } from "../src/lib/focused-repository";
import type { AuthUser } from "../src/lib/auth";

const count = Math.max(
  1,
  Math.min(
    500,
    Number(
      process.argv
        .find((value) => value.startsWith("--users="))
        ?.split("=")[1] || 100,
    ),
  ),
);
const concurrency = Math.max(
  1,
  Math.min(
    25,
    Number(
      process.argv
        .find((value) => value.startsWith("--concurrency="))
        ?.split("=")[1] || 10,
    ),
  ),
);
const pool = workerDb();
try {
  const users = await pool.query<AuthUser>(
    `SELECT id,name,email,role,(onboarding_completed_at IS NOT NULL) AS "onboardingCompleted",preferences
     FROM users ORDER BY (role='owner') DESC,created_at LIMIT 100`,
  );
  if (!users.rows.length)
    throw new Error(
      "Create at least one account before running the load simulation.",
    );
  const samples: Array<{ ms: number; bytes: number }> = [];
  for (let offset = 0; offset < count; offset += concurrency) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(concurrency, count - offset) },
        async (_, batchIndex) => {
          const index = offset + batchIndex;
          const user = users.rows[index % users.rows.length];
          const started = performance.now();
          const [summary, jobs] = await Promise.all([
            workspaceSummary(pool as unknown as PoolClient, user),
            listJobs(pool as unknown as PoolClient, user, {
              limit: 20,
              cursor: null,
              search: "",
              status: "all",
              monitor: "all",
              source: "all",
              matched: user.role !== "owner",
              location: "",
              mode: "all",
            }),
          ]);
          return {
            ms: performance.now() - started,
            bytes: Buffer.byteLength(JSON.stringify({ summary, jobs })),
          };
        },
      ),
    );
    samples.push(...batch);
  }
  const percentile = (values: number[], value: number) =>
    values.sort((a, b) => a - b)[
      Math.min(values.length - 1, Math.ceil(values.length * value) - 1)
    ];
  const latency = samples.map((sample) => sample.ms);
  const payload = samples.map((sample) => sample.bytes);
  const plan = await pool.query(
    `EXPLAIN (FORMAT JSON) SELECT id FROM jobs
     ORDER BY COALESCE(published_at,first_seen_at) DESC,id DESC LIMIT 20`,
  );
  const planNodes: string[] = [];
  const visitPlan = (node: Record<string, unknown>) => {
    planNodes.push(
      [node["Node Type"], node["Index Name"]].filter(Boolean).join(": "),
    );
    for (const child of (node.Plans as Array<Record<string, unknown>>) || [])
      visitPlan(child);
  };
  visitPlan(plan.rows[0]["QUERY PLAN"][0].Plan);
  console.log(
    JSON.stringify(
      {
        virtualUsers: count,
        concurrency,
        databasePoolMax: pool.options.max,
        latencyMs: {
          p50: Math.round(percentile(latency, 0.5)),
          p95: Math.round(percentile(latency, 0.95)),
          max: Math.round(Math.max(...latency)),
        },
        payloadBytes: {
          p50: percentile(payload, 0.5),
          p95: percentile(payload, 0.95),
          max: Math.max(...payload),
        },
        queryPlan: planNodes,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}

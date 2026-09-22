import { db } from "../src/lib/db";
import { backfillJobIntelligence } from "../src/lib/intelligence/queue";

const argument = process.argv.find((value) => value.startsWith("--limit="));
const limit = argument ? Number(argument.slice("--limit=".length)) : 100;
if (!Number.isInteger(limit) || limit < 1 || limit > 10_000)
  throw new Error("--limit must be an integer between 1 and 10000.");

const pool = db();
try {
  const queued = await backfillJobIntelligence(pool, limit);
  console.log(JSON.stringify({ considered: limit, queued }));
} finally {
  await pool.end();
}

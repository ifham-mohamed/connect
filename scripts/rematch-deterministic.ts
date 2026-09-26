import { db } from "../src/lib/db";

if (!process.argv.includes("--confirm"))
  throw new Error(
    "Pass --confirm to rebuild matches using deterministic rules.",
  );

// This script is deliberately independent of the running application's mode.
process.env.JEV_MODE = "off";
const { rebuildMatches } = await import("../src/lib/matching-repository");
const pool = db();
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(741210)");
  await rebuildMatches(client);
  await client.query("COMMIT");
  console.log("All monitor matches were rebuilt with deterministic rules.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}

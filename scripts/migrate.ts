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

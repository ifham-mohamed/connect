import { db } from "../src/lib/db";
let pool: ReturnType<typeof db> | undefined;
try {
  pool = db();
  const result = await pool.query(
    "SELECT current_database() AS database, (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls, to_regclass('public.schema_migrations') IS NOT NULL AS migrated",
  );
  console.log(JSON.stringify({ connected: true, ...result.rows[0] }));
} catch (error) {
  // Do not print connection objects, environment values, or credentials.
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    ENOTFOUND:
      "Database hostname could not be resolved. Check the service hostname in Aiven.",
    "28P01":
      "Database authentication failed. Check the service username and password in .env.",
    SELF_SIGNED_CERT_IN_CHAIN:
      "Set DATABASE_CA_CERT_PATH to the trusted CA certificate downloaded from Aiven.",
    DEPTH_ZERO_SELF_SIGNED_CERT:
      "Set DATABASE_CA_CERT_PATH to the trusted CA certificate downloaded from Aiven.",
    ECONNREFUSED:
      "Database refused the connection. Check the service status and port.",
  };
  console.error(
    code
      ? messages[code] || `Database connection failed (${code}).`
      : pool
        ? "Database check failed. Check network access and TLS settings."
        : (error as Error).message,
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}

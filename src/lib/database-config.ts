import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";

export function databaseConfig(
  env: Record<string, string | undefined> = process.env,
): PoolConfig {
  if (!env.DATABASE_URL)
    throw new Error("Set DATABASE_URL in .env to connect PostgreSQL.");
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL URL, without backslashes.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use postgres:// or postgresql://.");
  if (
    ["password", "YOUR_PASSWORD", "replace-me"].includes(
      decodeURIComponent(url.password),
    )
  ) {
    throw new Error(
      "Database setup is incomplete: replace the password placeholder in .env with your Aiven service password.",
    );
  }
  const remote = !["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(
    url.hostname,
  );
  const tls =
    remote ||
    ["require", "verify-ca", "verify-full"].includes(
      url.searchParams.get("sslmode") || "",
    );
  // Apply TLS explicitly so URL options cannot override certificate verification.
  if (tls) {
    for (const key of [
      "sslmode",
      "ssl",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "uselibpqcompat",
    ])
      url.searchParams.delete(key);
  }
  const ca =
    env.DATABASE_CA_CERT?.replace(/\\n/g, "\n") ||
    (env.DATABASE_CA_CERT_PATH
      ? readFileSync(env.DATABASE_CA_CERT_PATH, "utf8")
      : undefined);
  return {
    connectionString: url.toString(),
    ...(tls
      ? { ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) } }
      : {}),
    max: Math.max(1, Math.min(10, Number(env.DATABASE_POOL_MAX || 5))),
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 20000,
    keepAlive: true,
    application_name: "jobradar",
  };
}

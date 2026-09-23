import { Pool, type PoolClient } from "pg";
import { databaseConfig } from "./database-config";
const globalDb = globalThis as unknown as {
  jobradarPool?: Pool;
  jobradarWorkerPool?: Pool;
};
function pool(role: "web" | "worker") {
  if (
    !process.env.DATABASE_URL &&
    !process.env.DATABASE_WEB_URL &&
    !process.env.DATABASE_WORKER_URL
  )
    throw new Error("DATABASE_URL is not configured");
  const key = role === "worker" ? "jobradarWorkerPool" : "jobradarPool";
  if (!globalDb[key]) {
    globalDb[key] = new Pool(databaseConfig(process.env, role));
    globalDb[key]!.on("error", (error) =>
      console.error("Idle database connection failed", error.message),
    );
  }
  return globalDb[key]!;
}
export function db() {
  return pool("web");
}
export function workerDb() {
  return pool("worker");
}

type Connectable = { connect: () => Promise<PoolClient> };

function transientConnectionError(error: unknown) {
  const value = error as { code?: string; message?: string };
  return (
    ["ECONNRESET", "ETIMEDOUT", "57P01", "57P02", "57P03"].includes(
      value.code || "",
    ) || /connection.*(?:terminated|timeout|closed)/i.test(value.message || "")
  );
}

export async function connectDatabase(
  connectable: Connectable = db(),
  retryDelayMs = 100,
) {
  try {
    return await connectable.connect();
  } catch (error) {
    if (!transientConnectionError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    return connectable.connect();
  }
}

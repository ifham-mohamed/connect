import { Pool } from "pg";
import { databaseConfig } from "./database-config";
const globalDb = globalThis as unknown as { jobradarPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!globalDb.jobradarPool) {
    globalDb.jobradarPool = new Pool(databaseConfig());
    globalDb.jobradarPool.on("error", (error) =>
      console.error("Idle database connection failed", error.message),
    );
  }
  return globalDb.jobradarPool;
}

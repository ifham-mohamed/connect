import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { createJevClient } from "../src/lib/jev/client";
import { jevConfig } from "../src/lib/jev/config";
import {
  classifierForClient,
  processIntelligenceBatch,
} from "../src/lib/intelligence/worker";

const config = jevConfig();
if (config.mode === "off")
  throw new Error("Set JEV_MODE=shadow to run the intelligence worker.");

const pool = db();
const client = await pool.connect();
const classifier = classifierForClient(createJevClient(config));
const workerId = `jev-${process.pid}-${randomUUID().slice(0, 8)}`;
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

try {
  do {
    const summary = await processIntelligenceBatch(
      client,
      classifier,
      config,
      workerId,
    );
    console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
    if (process.argv.includes("--once")) break;
    if (summary.claimed === 0)
      await new Promise((resolve) => setTimeout(resolve, 5_000));
  } while (!stopping);
} finally {
  client.release();
  await pool.end();
}

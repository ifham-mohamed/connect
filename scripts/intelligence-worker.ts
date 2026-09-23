import { randomUUID } from "node:crypto";
import { workerDb } from "../src/lib/db";
import { createJevClient } from "../src/lib/jev/client";
import { jevConfig } from "../src/lib/jev/config";
import {
  classifierForClient,
  processIntelligenceBatch,
} from "../src/lib/intelligence/worker";

const config = jevConfig();
if (config.mode === "off")
  throw new Error("Set JEV_MODE=shadow to run the intelligence worker.");

const pool = workerDb();
const client = await pool.connect();
const classifier = classifierForClient(createJevClient(config));
const workerId = `jev-${process.pid}-${randomUUID().slice(0, 8)}`;
try {
  const summary = await processIntelligenceBatch(
    client,
    classifier,
    config,
    workerId,
  );
  console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
} finally {
  client.release();
  await pool.end();
}

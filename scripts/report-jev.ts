import { db } from "../src/lib/db";
import { getIntelligenceHealth } from "../src/lib/intelligence/report";

const pool = db();
try {
  console.log(JSON.stringify(await getIntelligenceHealth(pool), null, 2));
} finally {
  await pool.end();
}

import { syncSources } from "../src/lib/sync";
import { db } from "../src/lib/db";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
do {
  try {
    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        ...(await syncSources()),
      }),
    );
  } catch (error) {
    console.error(error);
    if (process.argv.includes("--once")) process.exitCode = 1;
  }
  if (process.argv.includes("--once")) break;
  for (let i = 0; i < 60 && !stopping; i++)
    await new Promise((resolve) => setTimeout(resolve, 1000));
} while (!stopping);
await db().end();

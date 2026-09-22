import { db } from "../src/lib/db";
import { syncSources } from "../src/lib/sync";

try {
  const result = await syncSources({
    kind: "topjobs",
    board: "SDQ",
    force: true,
  });
  console.log(JSON.stringify(result));
  if (
    result.busy ||
    !result.results.length ||
    result.results.some((source) => source.status !== "success")
  )
    process.exitCode = 1;
} finally {
  await db().end();
}

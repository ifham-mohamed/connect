import { syncSources } from "../src/lib/sync";
import { workerDb } from "../src/lib/db";
try {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      ...(await syncSources({}, workerDb())),
    }),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await workerDb().end();
}

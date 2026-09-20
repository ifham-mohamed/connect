import { collect } from "../src/lib/connectors";
import type { Source } from "../src/lib/types";
// Explicit manual smoke check; do not put this in CI or call it more frequently than source policies permit.
const sources: Source[] = [
  {
    id: "check-itpro",
    name: "ITPro.lk",
    kind: "itpro",
    board: "",
    intervalMinutes: 60,
    enabled: true,
    lastAttemptAt: null,
    lastSyncedAt: null,
    lastError: null,
    jobCount: 0,
  },
  {
    id: "check-remotive",
    name: "Remotive",
    kind: "remotive",
    board: "",
    intervalMinutes: 360,
    enabled: true,
    lastAttemptAt: null,
    lastSyncedAt: null,
    lastError: null,
    jobCount: 0,
  },
  {
    id: "check-lever",
    name: "Dijital Team",
    kind: "lever",
    board: "dijital-team-pty-ltd",
    intervalMinutes: 60,
    enabled: true,
    lastAttemptAt: null,
    lastSyncedAt: null,
    lastError: null,
    jobCount: 0,
  },
];
for (const source of sources) {
  try {
    const jobs = await collect(source);
    console.log(
      JSON.stringify({
        source: source.name,
        count: jobs.length,
        example: jobs[0]
          ? {
              title: jobs[0].title,
              company: jobs[0].company,
              location: jobs[0].location,
              url: jobs[0].url,
              publishedAt: jobs[0].publishedAt,
            }
          : null,
      }),
    );
  } catch (error) {
    console.error(source.name, error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

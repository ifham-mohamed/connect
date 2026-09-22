import { readFileSync } from "node:fs";
import { jevConfig } from "../src/lib/jev/config";
import { classifyJobWithJev, createJevClient } from "../src/lib/jev/client";
import {
  deterministicFixtureResult,
  fixtureState,
  goldFixtureSchema,
  scoreLiveFixture,
} from "../src/lib/jev/evaluation";
import {
  jobDecisionStateSize,
  jobDecisionStateHash,
} from "../src/lib/intelligence/job-state";

const live = process.argv.includes("--live");
const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit="),
);
const requestedLimit = limitArgument
  ? Number(limitArgument.slice("--limit=".length))
  : undefined;
if (
  requestedLimit !== undefined &&
  (!Number.isInteger(requestedLimit) || requestedLimit < 1)
)
  throw new Error("--limit must be a positive integer.");

const fixtures = goldFixtureSchema
  .parse(
    JSON.parse(
      readFileSync(
        new URL("../tests/fixtures/jev-job-gold.json", import.meta.url),
        "utf8",
      ),
    ),
  )
  .slice(0, requestedLimit);

const states = fixtures.map((fixture) => fixtureState(fixture));
const sizes = states.map(jobDecisionStateSize);
const deterministicRows = fixtures.map((fixture) => {
  const actual = deterministicFixtureResult(fixture);
  return {
    id: fixture.id,
    source: fixture.sourceKind,
    expectedStage: fixture.expected.careerStage,
    deterministicStage: actual.careerStage,
    expectedMode: fixture.expected.workArrangement,
    deterministicMode: actual.workArrangement,
    expectedTech: fixture.expected.isTechnologyRole,
    deterministicTech: actual.isTechnologyRole,
  };
});
const deterministicAccuracy = {
  careerStage:
    deterministicRows.filter(
      (row) =>
        row.deterministicStage ===
        (row.expectedStage === "unclear" ? "other" : row.expectedStage),
    ).length / fixtures.length,
  workArrangement:
    deterministicRows.filter(
      (row) => row.deterministicMode === row.expectedMode,
    ).length / fixtures.length,
  isTechnologyRole:
    deterministicRows.filter(
      (row) => row.deterministicTech === row.expectedTech,
    ).length / fixtures.length,
};

console.log(
  JSON.stringify(
    {
      mode: live ? "live" : "offline",
      fixtureCount: fixtures.length,
      sources: [...new Set(fixtures.map((fixture) => fixture.sourceKind))],
      stateBytes: {
        minimum: Math.min(...sizes),
        maximum: Math.max(...sizes),
        average: Math.round(
          sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
        ),
      },
      stateHashSample: jobDecisionStateHash(states[0]).slice(0, 12),
      deterministicAccuracy,
      deterministicRows,
    },
    null,
    2,
  ),
);

if (live) {
  const config = jevConfig();
  const client = createJevClient(config);
  const totals = {
    careerStage: 0,
    workArrangement: 0,
    isTechnologyRole: 0,
    roleFamily: 0,
    contentQuality: 0,
  };
  const liveRows = [];

  for (let index = 0; index < fixtures.length; index++) {
    const fixture = fixtures[index];
    const response = await classifyJobWithJev(client, states[index]);
    const scores = scoreLiveFixture(fixture, response.result);
    for (const field of Object.keys(totals) as Array<keyof typeof totals>)
      totals[field] += Number(scores[field]);
    liveRows.push({
      id: fixture.id,
      model: response.result.model,
      requestId: response.requestId,
      latencyMs: response.latencyMs,
      inputTokens: response.result.usage.input_tokens,
      outputTokens: response.result.usage.output_tokens,
      scores,
      predictions: {
        careerStage: response.result.answers.careerStage.choice,
        workArrangement: response.result.answers.workArrangement.choice,
        isTechnologyRole: response.result.answers.isTechnologyRole.noul,
        roleFamily: response.result.answers.roleFamily.choice,
        contentQuality: response.result.answers.contentQuality.choice,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        liveRows,
        accuracy: Object.fromEntries(
          Object.entries(totals).map(([field, correct]) => [
            field,
            correct / fixtures.length,
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

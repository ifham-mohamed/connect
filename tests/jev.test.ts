import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { classifyJobWithJev } from "../src/lib/jev/client";
import { jevConfig } from "../src/lib/jev/config";
import { validateJobClassification } from "../src/lib/jev/contract";
import { fixtureState, goldFixtureSchema } from "../src/lib/jev/evaluation";
import { reviewShadowDecision } from "../src/lib/jev/policy";
import {
  JOB_CLASSIFICATION_VERSION,
  jobClassificationQuestionsV1,
} from "../src/lib/jev/questions/job-classification-v1";
import {
  JOB_STATE_LIMITS,
  buildJobDecisionState,
  jobDecisionStateHash,
  jobDecisionStateSize,
} from "../src/lib/intelligence/job-state";

const fixtures = goldFixtureSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("./fixtures/jev-job-gold.json", import.meta.url),
      "utf8",
    ),
  ),
);

function validResponse() {
  const probabilities = <T extends readonly string[]>(
    values: T,
    selected: T[number],
  ) =>
    Object.fromEntries(
      values.map((value) => [value, value === selected ? 1 : 0]),
    );
  const roleFamilies = [
    "software",
    "frontend",
    "backend",
    "full_stack",
    "data",
    "infrastructure",
    "security",
    "qa",
    "design",
    "product",
    "support",
    "other",
  ] as const;
  const careerStages = [
    "internship",
    "entry",
    "mid",
    "senior",
    "unclear",
  ] as const;
  const workArrangements = ["onsite", "hybrid", "remote", "unclear"] as const;
  const qualities = ["usable", "sparse", "malformed", "non_job"] as const;
  return {
    model: "jev-test",
    answers: {
      isTechnologyRole: { type: "noul", noul: 1 },
      roleFamily: {
        type: "choice",
        choice: "software",
        confidence: 1,
        probabilities: probabilities(roleFamilies, "software"),
      },
      careerStage: {
        type: "choice",
        choice: "entry",
        confidence: 1,
        probabilities: probabilities(careerStages, "entry"),
      },
      workArrangement: {
        type: "choice",
        choice: "onsite",
        confidence: 1,
        probabilities: probabilities(workArrangements, "onsite"),
      },
      contentQuality: {
        type: "choice",
        choice: "usable",
        confidence: 1,
        probabilities: probabilities(qualities, "usable"),
      },
    },
    usage: { input_tokens: 100, output_tokens: 20 },
  } as const;
}

describe("JEV configuration", () => {
  it("is disabled and network-free by default", () => {
    expect(jevConfig({})).toMatchObject({
      mode: "off",
      model: "jev-latest",
      timeoutMs: 10_000,
      maxRetries: 2,
    });
  });

  it("requires a key when shadow or assisted mode is enabled", () => {
    expect(() => jevConfig({ JEV_MODE: "shadow" })).toThrow("TYPESAFE_API_KEY");
    expect(
      jevConfig({ JEV_MODE: "shadow", TYPESAFE_API_KEY: "test-key" }).mode,
    ).toBe("shadow");
  });
});

describe("JEV v1 domain contract", () => {
  it("defines the reviewed atomic question set", () => {
    expect(JOB_CLASSIFICATION_VERSION).toBe("job-classification-v1");
    expect(Object.keys(jobClassificationQuestionsV1)).toEqual([
      "isTechnologyRole",
      "roleFamily",
      "careerStage",
      "workArrangement",
      "contentQuality",
    ]);
    expect(jobClassificationQuestionsV1.careerStage.criteria).toHaveProperty(
      "unclear",
    );
  });

  it("validates exact response labels and probability distributions", () => {
    expect(validateJobClassification(validResponse()).questionSetVersion).toBe(
      JOB_CLASSIFICATION_VERSION,
    );
    const invalid = structuredClone(validResponse());
    invalid.answers.careerStage.probabilities.entry = 0.8;
    expect(() => validateJobClassification(invalid)).toThrow();
  });

  it("builds bounded, plain-text, stable decision state", () => {
    const state = buildJobDecisionState({
      sourceKind: "itpro",
      title: "  Senior   Associate Software Engineer  ",
      company: "Acme",
      location: "Colombo",
      remote: false,
      employmentType: "Full time",
      tags: ["Level III"],
      description: `<script>bad()</script><p>${"Build software. ".repeat(2000)}</p>`,
    });
    expect(state.title).toBe("Senior Associate Software Engineer");
    expect(state.description).not.toContain("script");
    expect(state.description.length).toBeLessThanOrEqual(
      JOB_STATE_LIMITS.description,
    );
    expect(state.deterministicSignals.careerStage).toBe("senior");
    expect(state.deterministicSignals.careerStageTerms).toContain("senior");
    expect(jobDecisionStateHash(state)).toMatch(/^[a-f0-9]{64}$/);
    expect(jobDecisionStateHash(state)).toBe(jobDecisionStateHash(state));
    expect(jobDecisionStateSize(state)).toBeLessThan(14_000);
  });

  it("covers every supported source and adversarial career stages", () => {
    expect(new Set(fixtures.map((fixture) => fixture.sourceKind)).size).toBe(
      11,
    );
    expect(fixtures.map((fixture) => fixture.title)).toEqual(
      expect.arrayContaining([
        "Senior Associate Software Engineer",
        "Frontend Developer III",
        "Data Engineer Level I",
      ]),
    );
    expect(
      fixtures.every(
        (fixture) => jobDecisionStateSize(fixtureState(fixture)) > 0,
      ),
    ).toBe(true);
  });
});

describe("JEV SDK boundary", () => {
  it("sends one typed request and validates the returned contract", async () => {
    let requestBody: unknown;
    const client = new TypeSafeClient({
      apiKey: "test-key",
      defaultModel: "jev-test",
      retry: { maxRetries: 0 },
      fetch: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify(validResponse()), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-typesafe-request-id": "request-1",
          },
        });
      },
    });

    const response = await classifyJobWithJev(
      client,
      fixtureState(fixtures[1]),
    );
    expect(requestBody).toMatchObject({ model: "jev-test" });
    expect(
      Object.keys((requestBody as { questions: object }).questions),
    ).toHaveLength(5);
    expect(response.requestId).toBe("request-1");
    expect(response.result.answers.careerStage.choice).toBe("entry");
  });

  it("keeps explicit stage conflicts in review and all other results in shadow", () => {
    const decision = validateJobClassification(validResponse());
    expect(
      reviewShadowDecision(
        { careerStage: "senior", workArrangement: "onsite" },
        decision,
      ),
    ).toMatchObject({ status: "review" });
    expect(
      reviewShadowDecision(
        { careerStage: "entry", workArrangement: "onsite" },
        decision,
      ),
    ).toEqual({
      status: "shadow_only",
      reasons: ["thresholds_not_calibrated"],
    });
  });
});

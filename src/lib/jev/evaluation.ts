import { z } from "zod";
import { detectExperience, detectWorkMode, techPattern } from "../matching";
import type { SourceKind } from "../types";
import { buildJobDecisionState } from "../intelligence/job-state";
import type { ValidatedJobClassification } from "./contract";

const sourceKind = z.enum([
  "topjobs",
  "xpressjobs",
  "jobeka",
  "itpro",
  "rooster",
  "neojobs",
  "jobster",
  "remotive",
  "arbeitnow",
  "greenhouse",
  "lever",
]);

export const goldFixtureSchema = z.array(
  z.object({
    id: z.string().min(1),
    sourceKind,
    title: z.string(),
    company: z.string(),
    location: z.string(),
    remote: z.boolean(),
    employmentType: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    expected: z.object({
      careerStage: z.enum(["internship", "entry", "mid", "senior", "unclear"]),
      workArrangement: z.enum(["onsite", "hybrid", "remote", "unclear"]),
      isTechnologyRole: z.boolean(),
      roleFamily: z.enum([
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
      ]),
      contentQuality: z.enum(["usable", "sparse", "malformed", "non_job"]),
    }),
  }),
);

export type GoldFixture = z.infer<typeof goldFixtureSchema>[number];

export function fixtureState(fixture: GoldFixture) {
  return buildJobDecisionState({
    sourceKind: fixture.sourceKind as SourceKind,
    title: fixture.title,
    company: fixture.company,
    location: fixture.location,
    remote: fixture.remote,
    employmentType: fixture.employmentType,
    tags: fixture.tags,
    description: fixture.description,
  });
}

export function deterministicFixtureResult(fixture: GoldFixture) {
  const state = fixtureState(fixture);
  const text = `${state.title} ${state.tags.join(" ")}`;
  return {
    careerStage: detectExperience(text),
    workArrangement: detectWorkMode({
      title: state.title,
      tags: state.tags,
      location: state.location,
      remote: state.remoteFlag,
    }),
    isTechnologyRole: techPattern.test(
      `${state.title} ${state.tags.join(" ")} ${state.description}`,
    ),
  };
}

export function scoreLiveFixture(
  fixture: GoldFixture,
  result: ValidatedJobClassification,
) {
  return {
    careerStage:
      result.answers.careerStage.choice === fixture.expected.careerStage,
    workArrangement:
      result.answers.workArrangement.choice ===
      fixture.expected.workArrangement,
    isTechnologyRole:
      result.answers.isTechnologyRole.noul >= 0.5 ===
      fixture.expected.isTechnologyRole,
    roleFamily:
      result.answers.roleFamily.choice === fixture.expected.roleFamily,
    contentQuality:
      result.answers.contentQuality.choice === fixture.expected.contentQuality,
  };
}

import { createHash } from "node:crypto";
import type { SourceKind, WorkMode } from "../types";
import {
  detectExperience,
  detectExperienceSignals,
  detectWorkMode,
  plainText,
} from "../matching";

export const JOB_STATE_LIMITS = {
  title: 240,
  company: 160,
  location: 200,
  employmentType: 120,
  tag: 80,
  tags: 30,
  description: 12_000,
} as const;

type JobStateInput = {
  sourceKind: SourceKind;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: string;
  tags: string[];
  description: string;
};

export type JobDecisionState = ReturnType<typeof buildJobDecisionState>;

function normalized(value: string, limit: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function buildJobDecisionState(input: JobStateInput) {
  const title = normalized(input.title, JOB_STATE_LIMITS.title);
  const location = normalized(input.location, JOB_STATE_LIMITS.location);
  const tags = input.tags
    .map((tag) => normalized(tag, JOB_STATE_LIMITS.tag))
    .filter(Boolean)
    .slice(0, JOB_STATE_LIMITS.tags);
  const signalText = `${title} ${tags.join(" ")}`;
  const signals = detectExperienceSignals(signalText);
  const careerStageTerms = Object.values(signals).flat();

  return {
    sourceKind: input.sourceKind,
    title,
    company: normalized(input.company, JOB_STATE_LIMITS.company),
    location,
    remoteFlag: input.remote,
    employmentType: normalized(
      input.employmentType,
      JOB_STATE_LIMITS.employmentType,
    ),
    tags,
    description: normalized(
      plainText(input.description),
      JOB_STATE_LIMITS.description,
    ),
    deterministicSignals: {
      careerStage: detectExperience(signalText),
      careerStageTerms,
      workArrangement: detectWorkMode({
        title,
        tags,
        location,
        remote: input.remote,
      }) as WorkMode,
    },
  } as const;
}

export function jobDecisionStateHash(state: JobDecisionState) {
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

export function jobDecisionStateSize(state: JobDecisionState) {
  return Buffer.byteLength(JSON.stringify(state), "utf8");
}

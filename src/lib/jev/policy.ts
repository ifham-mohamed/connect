import type { ExperienceLevel, WorkMode } from "../types";
import type { ValidatedJobClassification } from "./contract";

export type JevPolicyOutcome =
  | { status: "shadow_only"; reasons: string[] }
  | { status: "review"; reasons: string[] };

export function reviewShadowDecision(
  deterministic: {
    careerStage: ExperienceLevel;
    workArrangement: WorkMode;
  },
  decision: ValidatedJobClassification,
): JevPolicyOutcome {
  const reasons: string[] = [];
  const predictedStage = decision.answers.careerStage.choice;
  if (
    deterministic.careerStage !== "other" &&
    predictedStage !== "unclear" &&
    predictedStage !== deterministic.careerStage
  )
    reasons.push("explicit_career_stage_conflict");

  const predictedMode = decision.answers.workArrangement.choice;
  if (
    deterministic.workArrangement === "remote" &&
    predictedMode !== "remote" &&
    predictedMode !== "unclear"
  )
    reasons.push("explicit_remote_conflict");

  return reasons.length
    ? { status: "review", reasons }
    : { status: "shadow_only", reasons: ["thresholds_not_calibrated"] };
}

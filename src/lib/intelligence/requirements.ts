import { createHash } from "node:crypto";
import { z } from "zod";
import type { TypeSafeClient, Questions } from "@typesafe-ai/sdk";
import { plainText } from "../matching";

export const REQUIREMENT_QUESTION_VERSION = "requirement-labeling-v1";
const trigger =
  /\b(required|requirement|must have|need to|experience (?:with|in)|proficien(?:t|cy) (?:with|in)|knowledge of|familiarity with|degree in|responsible for|ability to|hands.on|skilled in)\b/i;
const choiceAnswer = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: z.number().min(0).max(1),
  probabilities: z.record(z.string(), z.number().min(0).max(1)),
});

export type RequirementCandidate = {
  evidence: string;
  startOffset: number;
  endOffset: number;
  groupKind: "and" | "or" | "single";
};

export function requirementText(description: string) {
  return plainText(description).replace(/\r\n?/g, "\n").slice(0, 12000);
}

export function requirementDescriptionHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function extractRequirementCandidates(
  text: string,
  limit = 8,
): RequirementCandidate[] {
  const result: RequirementCandidate[] = [];
  const sentence = /[^\n.!?]+[.!?]?/g;
  for (const match of text.matchAll(sentence)) {
    const segment = match[0];
    const leading = segment.length - segment.trimStart().length;
    const evidence = segment.trim();
    if (
      !trigger.test(evidence) ||
      evidence.length < 15 ||
      evidence.length > 300
    )
      continue;
    const startOffset = (match.index || 0) + leading;
    result.push({
      evidence,
      startOffset,
      endOffset: startOffset + evidence.length,
      groupKind: /\b(or|either)\b/i.test(evidence)
        ? "or"
        : /\band\b/i.test(evidence)
          ? "and"
          : "single",
    });
    if (result.length >= limit) break;
  }
  return result;
}

export type LabeledRequirement = RequirementCandidate & {
  category: "skill" | "experience" | "education" | "responsibility" | "other";
  importance: "required" | "preferred" | "unclear";
  confidence: number;
};

export async function labelRequirementsWithJev(
  client: TypeSafeClient,
  title: string,
  text: string,
  candidates: RequirementCandidate[],
) {
  if (!candidates.length)
    return { model: "", requirements: [] as LabeledRequirement[] };
  const questions: Questions = {};
  candidates.forEach((_candidate, index) => {
    questions[`r${index}Importance`] = {
      type: "choice",
      instructions: `For candidate phrase ${index + 1}, is this a required qualification, a preferred qualification, or unclear? Only label the supplied phrase.`,
      criteria: {
        required: "Explicit must-have qualification or requirement",
        preferred: "Explicit nice-to-have or preferred qualification",
        unclear: "Not clearly a candidate qualification",
      },
    };
    questions[`r${index}Category`] = {
      type: "choice",
      instructions: `Classify candidate phrase ${index + 1} without adding content.`,
      criteria: {
        skill: "Tool, technology, method, or professional skill",
        experience: "Years or depth of past experience",
        education: "Degree or formal education",
        responsibility: "Work the hire would perform",
        other: "None of these categories",
      },
    };
  });
  const response = await client.systemOne({
    state: {
      title,
      description: text.slice(0, 8000),
      candidates: candidates.map((candidate) => candidate.evidence),
    },
    questions,
  });
  const answers = z.record(z.string(), choiceAnswer).parse(response.answers);
  const requirements = candidates.map((candidate, index) => {
    const importance = answers[`r${index}Importance`];
    const category = answers[`r${index}Category`];
    if (!importance || !category)
      throw new Error("Missing JEV requirement answer.");
    return {
      ...candidate,
      importance: z
        .enum(["required", "preferred", "unclear"])
        .parse(importance.choice),
      category: z
        .enum(["skill", "experience", "education", "responsibility", "other"])
        .parse(category.choice),
      confidence: Math.min(importance.confidence, category.confidence),
    } satisfies LabeledRequirement;
  });
  return { model: response.model, requirements };
}

import { z } from "zod";
import { JOB_CLASSIFICATION_VERSION } from "./questions/job-classification-v1";

const probability = z.number().min(0).max(1);

function choiceAnswer<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z
    .object({
      type: z.literal("choice"),
      choice: z.enum(values),
      confidence: probability,
      probabilities: z.record(z.string(), probability),
    })
    .strict()
    .superRefine((answer, context) => {
      const expected = new Set<string>(values);
      const received = Object.keys(answer.probabilities);
      if (
        received.length !== expected.size ||
        received.some((key) => !expected.has(key))
      )
        context.addIssue({
          code: "custom",
          path: ["probabilities"],
          message: "Probability labels must exactly match the Choice criteria.",
        });
      const total = Object.values(answer.probabilities).reduce(
        (sum, value) => sum + value,
        0,
      );
      if (Math.abs(total - 1) > 0.01)
        context.addIssue({
          code: "custom",
          path: ["probabilities"],
          message: "Choice probabilities must sum to one.",
        });
    });
}

export const jobClassificationResultSchema = z
  .object({
    model: z.string().min(1),
    answers: z.object({
      isTechnologyRole: z
        .object({
          type: z.literal("noul"),
          noul: probability,
        })
        .strict(),
      roleFamily: choiceAnswer([
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
      careerStage: choiceAnswer([
        "internship",
        "entry",
        "mid",
        "senior",
        "unclear",
      ]),
      workArrangement: choiceAnswer(["onsite", "hybrid", "remote", "unclear"]),
      contentQuality: choiceAnswer([
        "usable",
        "sparse",
        "malformed",
        "non_job",
      ]),
    }),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative(),
        output_tokens: z.number().int().nonnegative(),
      })
      .strict(),
    // Vercel AI Gateway adds routing and billing metadata to the TypeSafe
    // response. It is transport data, so validate its shape and discard it.
    provider_metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .transform((response) => ({
    model: response.model,
    answers: response.answers,
    usage: response.usage,
  }));

export type ValidatedJobClassification = z.infer<
  typeof jobClassificationResultSchema
> & { questionSetVersion: typeof JOB_CLASSIFICATION_VERSION };

export function validateJobClassification(value: unknown) {
  return {
    ...jobClassificationResultSchema.parse(value),
    questionSetVersion: JOB_CLASSIFICATION_VERSION,
  } satisfies ValidatedJobClassification;
}

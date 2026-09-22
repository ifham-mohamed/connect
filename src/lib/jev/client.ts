import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { JevConfig } from "./config";
import { validateJobClassification } from "./contract";
import { jobClassificationQuestionsV1 } from "./questions/job-classification-v1";
import type { JobDecisionState } from "../intelligence/job-state";

export function createJevClient(config: JevConfig) {
  if (!config.apiKey)
    throw new Error("TYPESAFE_API_KEY is required to create the JEV client.");
  return new TypeSafeClient({
    apiKey: config.apiKey,
    defaultModel: config.model,
    timeout: config.timeoutMs,
    retry: { maxRetries: config.maxRetries },
    // Request bodies contain job text, so production logging stays disabled.
    logLevel: "off",
  });
}

export async function classifyJobWithJev(
  client: TypeSafeClient,
  state: JobDecisionState,
) {
  const started = performance.now();
  const result = await client
    .systemOne({ state, questions: jobClassificationQuestionsV1 })
    .withResponse();
  return {
    result: validateJobClassification(result.data),
    requestId: result.requestId,
    latencyMs: Math.round(performance.now() - started),
  };
}

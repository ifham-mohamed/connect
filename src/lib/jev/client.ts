import {
  AuthenticationError,
  PermissionDeniedError,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import type { JevConfig } from "./config";
import { validateJobClassification } from "./contract";
import { jobClassificationQuestionsV1 } from "./questions/job-classification-v1";
import type { JobDecisionState } from "../intelligence/job-state";

export function createJevClient(config: JevConfig) {
  if (!config.apiKey)
    throw new Error(
      config.provider === "vercel"
        ? "AI_GATEWAY_API_KEY is required to create the JEV client."
        : "TYPESAFE_API_KEY is required to create the JEV client.",
    );
  return new TypeSafeClient({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
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

export async function testJevConnection(
  client: TypeSafeClient,
  config: JevConfig,
) {
  const started = performance.now();
  const models = await client.models.list();
  return {
    latencyMs: Math.round(performance.now() - started),
    modelAvailable: models.some((model) => model.name === config.model),
  };
}

export function jevConnectionMessage(error: unknown, config: JevConfig) {
  if (error instanceof AuthenticationError)
    return config.provider === "vercel"
      ? "Vercel AI Gateway rejected AI_GATEWAY_API_KEY. Create or copy a current key from the selected Vercel team, then update the ignored .env file."
      : "TypeSafe rejected TYPESAFE_API_KEY. Replace it with a current direct TypeSafe credential.";
  if (error instanceof PermissionDeniedError) {
    const detail = error.message.toLowerCase();
    if (config.provider === "vercel" && detail.includes("credit card"))
      return "Vercel authenticated the Gateway key, but this team must add a valid credit card before AI Gateway unlocks its free credits: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card";
    return `${config.provider === "vercel" ? "Vercel AI Gateway" : "TypeSafe"} authenticated the credential but denied access to ${config.model}. Check the selected team, model access, and spend controls.`;
  }
  return error instanceof Error
    ? `JEV request failed: ${error.message}`
    : "JEV request failed for an unknown reason.";
}

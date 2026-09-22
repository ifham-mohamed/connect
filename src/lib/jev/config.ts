import { z } from "zod";

const modeSchema = z.enum(["off", "shadow", "assisted"]);
const providerSchema = z.enum(["vercel", "typesafe"]);

const VERCEL_TYPESAFE_BASE_URL = "https://ai-gateway.vercel.sh/typesafe";

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    throw new Error(`Expected an integer between ${minimum} and ${maximum}.`);
  return parsed;
}

export type JevConfig = ReturnType<typeof jevConfig>;

export function jevQueueEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.JEV_MODE === "shadow" || env.JEV_MODE === "assisted";
}

export function jevConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const mode = modeSchema.parse(env.JEV_MODE?.trim() || "off");
  const provider = providerSchema.parse(
    env.JEV_PROVIDER?.trim() ||
      (env.AI_GATEWAY_API_KEY?.trim() ? "vercel" : "typesafe"),
  );
  const apiKey =
    provider === "vercel"
      ? env.AI_GATEWAY_API_KEY?.trim() || ""
      : env.TYPESAFE_API_KEY?.trim() || "";
  if (mode !== "off" && !apiKey)
    throw new Error(
      provider === "vercel"
        ? "Set AI_GATEWAY_API_KEY before enabling JEV shadow or assisted mode with Vercel AI Gateway."
        : "Set TYPESAFE_API_KEY before enabling JEV shadow or assisted mode with TypeSafe directly.",
    );

  return {
    mode,
    provider,
    apiKey,
    baseURL:
      provider === "vercel"
        ? env.JEV_BASE_URL?.trim() || VERCEL_TYPESAFE_BASE_URL
        : env.JEV_BASE_URL?.trim() || undefined,
    model:
      env.JEV_MODEL?.trim() ||
      (provider === "vercel" ? "typesafe-ai/jev" : "jev-latest"),
    timeoutMs: boundedInteger(
      env.JEV_REQUEST_TIMEOUT_MS,
      10_000,
      1_000,
      60_000,
    ),
    maxRetries: boundedInteger(env.JEV_MAX_RETRIES, 2, 0, 5),
    maxAttempts: boundedInteger(env.JEV_MAX_ATTEMPTS, 5, 1, 20),
    batchSize: boundedInteger(env.JEV_BATCH_SIZE, 5, 1, 25),
  } as const;
}

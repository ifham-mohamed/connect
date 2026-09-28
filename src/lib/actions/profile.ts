import { z } from "zod";
import { db } from "../db";
import { encryptUserJevApiKey } from "../user-jev-key";
import { platformJevConfig } from "../jev/config";

export async function updateProfile(userId: string, data: unknown) {
  const value = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      aiAnalysisEnabled: z.boolean().optional(),
      aiCredentialMode: z.enum(["platform", "personal"]).optional(),
      jevApiKey: z.string().trim().max(512).optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.aiAnalysisEnabled !== undefined ||
        input.aiCredentialMode !== undefined ||
        input.jevApiKey !== undefined,
    )
    .parse(data);
  if (value.name !== undefined)
    await db().query("UPDATE users SET name=$2 WHERE id=$1", [
      userId,
      value.name,
    ]);
  let encryptedKey: string | null | undefined;
  if (value.jevApiKey !== undefined)
    encryptedKey = value.jevApiKey
      ? encryptUserJevApiKey(value.jevApiKey)
      : null;
  type CurrentProfile = {
    configured: boolean;
    preferences: { aiCredentialMode?: "platform" | "personal" };
  };
  let current: CurrentProfile | undefined;
  if (
    value.aiAnalysisEnabled === true ||
    value.aiCredentialMode !== undefined
  ) {
    const result = await db().query<CurrentProfile>(
      "SELECT jev_api_key_encrypted IS NOT NULL AS configured, preferences FROM users WHERE id=$1",
      [userId],
    );
    current = result.rows[0];
  }
  const mode =
    value.aiCredentialMode ??
    current?.preferences.aiCredentialMode ??
    (current?.configured ? "personal" : "platform");
  if (value.aiAnalysisEnabled === true) {
    if (
      mode === "personal" &&
      !(encryptedKey !== undefined ? encryptedKey : current?.configured)
    )
      throw new Error("JEV_API_KEY_REQUIRED");
    if (mode === "platform" && !platformJevConfig())
      throw new Error("PLATFORM_AI_NOT_CONFIGURED");
  }
  if (encryptedKey !== undefined)
    await db().query("UPDATE users SET jev_api_key_encrypted=$2 WHERE id=$1", [
      userId,
      encryptedKey,
    ]);
  if (value.aiAnalysisEnabled !== undefined)
    await db().query(
      "UPDATE users SET preferences=jsonb_set(preferences,'{aiAnalysisEnabled}',$2::jsonb,true) WHERE id=$1",
      [userId, JSON.stringify(value.aiAnalysisEnabled)],
    );
  if (value.aiCredentialMode !== undefined)
    await db().query(
      "UPDATE users SET preferences=jsonb_set(preferences,'{aiCredentialMode}',$2::jsonb,true) WHERE id=$1",
      [userId, JSON.stringify(value.aiCredentialMode)],
    );
}

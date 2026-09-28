import { z } from "zod";
import { db } from "../db";
import { encryptUserJevApiKey } from "../user-jev-key";

export async function updateProfile(userId: string, data: unknown) {
  const value = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      aiAnalysisEnabled: z.boolean().optional(),
      jevApiKey: z.string().trim().max(512).optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined ||
        input.aiAnalysisEnabled !== undefined ||
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
  if (value.aiAnalysisEnabled === true && encryptedKey === undefined) {
    const current = await db().query<{ configured: boolean }>(
      "SELECT jev_api_key_encrypted IS NOT NULL AS configured FROM users WHERE id=$1",
      [userId],
    );
    if (!current.rows[0]?.configured) throw new Error("JEV_API_KEY_REQUIRED");
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
}

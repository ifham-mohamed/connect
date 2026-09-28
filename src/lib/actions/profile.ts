import { z } from "zod";
import { db } from "../db";

export async function updateProfile(userId: string, data: unknown) {
  const value = z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      aiAnalysisEnabled: z.boolean().optional(),
    })
    .refine(
      (input) =>
        input.name !== undefined || input.aiAnalysisEnabled !== undefined,
    )
    .parse(data);
  if (value.name !== undefined)
    await db().query("UPDATE users SET name=$2 WHERE id=$1", [
      userId,
      value.name,
    ]);
  if (value.aiAnalysisEnabled !== undefined)
    await db().query(
      "UPDATE users SET preferences=jsonb_set(preferences,'{aiAnalysisEnabled}',$2::jsonb,true) WHERE id=$1",
      [userId, JSON.stringify(value.aiAnalysisEnabled)],
    );
}

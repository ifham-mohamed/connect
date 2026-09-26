import { z } from "zod";
import { db } from "../db";

export async function updateProfile(userId: string, data: unknown) {
  const value = z
    .object({ name: z.string().trim().min(2).max(80) })
    .parse(data);
  await db().query("UPDATE users SET name=$2 WHERE id=$1", [
    userId,
    value.name,
  ]);
}

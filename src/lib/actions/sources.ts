import { z } from "zod";
import { db } from "../db";
import { sourceSchema } from "../validation";

export async function addSource(data: unknown) {
  const value = sourceSchema.parse(data);
  await db().query(
    "INSERT INTO sources(name,kind,board,interval_minutes) VALUES($1,$2,$3,$4)",
    [
      value.name,
      value.kind,
      value.board,
      ["remotive", "arbeitnow", "jobeka", "jobster"].includes(value.kind)
        ? 360
        : 60,
    ],
  );
}
export async function toggleSource(inputId: unknown, data: unknown) {
  const id = z.string().uuid().parse(inputId);
  const enabled = z.boolean().parse(data);
  await db().query("UPDATE sources SET enabled=$2 WHERE id=$1", [id, enabled]);
}

import { z } from "zod";
import { db } from "../db";
import { monitorSchema } from "../validation";
import { rebuildMatchesForMonitor } from "../matching-repository";

export async function changeMonitor(
  userId: string,
  action: "monitor-save" | "monitor-delete",
  inputId: unknown,
  data: unknown,
) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(741210)");
    if (action === "monitor-delete")
      await client.query("DELETE FROM monitors WHERE id=$1 AND user_id=$2", [
        z.string().uuid().parse(inputId),
        userId,
      ]);
    else {
      const v = monitorSchema.parse(data);
      let monitorId: string;
      if (inputId) {
        const updated = await client.query<{ id: string }>(
          "UPDATE monitors SET name=$3,keywords=$4,excluded_keywords=$5,location=$6,remote_only=$7,work_modes=$8,enabled=$9 WHERE id=$1 AND user_id=$2 RETURNING id",
          [
            inputId,
            userId,
            v.name,
            v.keywords,
            v.excludedKeywords,
            v.location,
            v.remoteOnly,
            v.workModes ||
              (v.remoteOnly ? ["remote"] : ["onsite", "hybrid", "remote"]),
            v.enabled,
          ],
        );
        if (!updated.rows[0]) throw new Error("MONITOR_NOT_FOUND");
        monitorId = updated.rows[0].id;
      } else {
        const inserted = await client.query<{ id: string }>(
          "INSERT INTO monitors(user_id,name,keywords,excluded_keywords,location,remote_only,work_modes,enabled) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
          [
            userId,
            v.name,
            v.keywords,
            v.excludedKeywords,
            v.location,
            v.remoteOnly,
            v.workModes ||
              (v.remoteOnly ? ["remote"] : ["onsite", "hybrid", "remote"]),
            v.enabled,
          ],
        );
        monitorId = inserted.rows[0].id;
      }
      await rebuildMatchesForMonitor(client, monitorId);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

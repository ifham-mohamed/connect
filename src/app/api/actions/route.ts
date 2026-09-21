import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitorSchema, sourceSchema } from "@/lib/validation";
import { rebuildMatchesForMonitor, syncSources } from "@/lib/sync";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 20000)
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 },
      );
    const body = z
      .object({
        action: z.enum([
          "monitor-save",
          "monitor-delete",
          "source-add",
          "source-toggle",
          "job-status",
          "job-reviewed",
          "profile-update",
          "sync",
        ]),
        id: z.string().uuid().optional(),
        data: z.unknown().optional(),
      })
      .parse(await request.json());
    const ownerAction = ["source-add", "source-toggle", "sync"].includes(
      body.action,
    );
    const user = await authorizeWrite(
      request,
      ownerAction ? "owner" : "member",
    );
    if (["job-status", "job-reviewed"].includes(body.action)) {
      const jobId = z.string().uuid().parse(body.id);
      const access = await db().query(
        `SELECT 1 FROM jobs j
          WHERE j.id=$2 AND (
            $3::text='owner'
            OR EXISTS (SELECT 1 FROM job_user_states state WHERE state.job_id=j.id AND state.user_id=$1)
            OR EXISTS (
              SELECT 1 FROM monitor_matches match
              JOIN monitors monitor ON monitor.id=match.monitor_id
              WHERE match.job_id=j.id AND monitor.user_id=$1 AND monitor.enabled
            )
          )`,
        [user.id, jobId, user.role],
      );
      if (!access.rowCount) throw new Error("JOB_NOT_FOUND");
    }
    if (body.action === "sync") return NextResponse.json(await syncSources());
    if (body.action === "source-add") {
      const value = sourceSchema.parse(body.data);
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
    } else if (body.action === "source-toggle") {
      const id = z.string().uuid().parse(body.id);
      const enabled = z.boolean().parse(body.data);
      await db().query("UPDATE sources SET enabled=$2 WHERE id=$1", [
        id,
        enabled,
      ]);
    } else if (body.action === "job-status") {
      const id = z.string().uuid().parse(body.id);
      const status = z
        .enum(["new", "saved", "applied", "archived"])
        .parse(body.data);
      await db().query(
        `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at)
         VALUES($1,$2,$3,now())
         ON CONFLICT(user_id,job_id) DO UPDATE
         SET status=excluded.status,reviewed_at=COALESCE(job_user_states.reviewed_at,now()),updated_at=now()`,
        [user.id, id, status],
      );
    } else if (body.action === "job-reviewed") {
      const id = z.string().uuid().parse(body.id);
      await db().query(
        `INSERT INTO job_user_states(user_id,job_id,status,reviewed_at)
         VALUES($1,$2,'new',now())
         ON CONFLICT(user_id,job_id) DO UPDATE SET reviewed_at=now(),updated_at=now()`,
        [user.id, id],
      );
    } else if (body.action === "profile-update") {
      const value = z
        .object({ name: z.string().trim().min(2).max(80) })
        .parse(body.data);
      await db().query("UPDATE users SET name=$2 WHERE id=$1", [
        user.id,
        value.name,
      ]);
    } else {
      const client = await db().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(741210)");
        if (body.action === "monitor-delete")
          await client.query(
            "DELETE FROM monitors WHERE id=$1 AND user_id=$2",
            [z.string().uuid().parse(body.id), user.id],
          );
        else {
          const v = monitorSchema.parse(body.data);
          let monitorId: string;
          if (body.id) {
            const updated = await client.query<{ id: string }>(
              "UPDATE monitors SET name=$3,keywords=$4,excluded_keywords=$5,location=$6,remote_only=$7,enabled=$8 WHERE id=$1 AND user_id=$2 RETURNING id",
              [
                body.id,
                user.id,
                v.name,
                v.keywords,
                v.excludedKeywords,
                v.location,
                v.remoteOnly,
                v.enabled,
              ],
            );
            if (!updated.rows[0]) throw new Error("MONITOR_NOT_FOUND");
            monitorId = updated.rows[0].id;
          } else {
            const inserted = await client.query<{ id: string }>(
              "INSERT INTO monitors(user_id,name,keywords,excluded_keywords,location,remote_only,enabled) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
              [
                user.id,
                v.name,
                v.keywords,
                v.excludedKeywords,
                v.location,
                v.remoteOnly,
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json(
        { error: "Sign in to make changes in this workspace." },
        { status: 401 },
      );
    if (message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Request origin is not allowed. Check APP_URL." },
        { status: 403 },
      );
    if (message === "OWNER_REQUIRED")
      return NextResponse.json(
        {
          error:
            "Only the workspace owner can manage sources or run collection.",
        },
        { status: 403 },
      );
    if (message === "JOB_NOT_FOUND" || message === "MONITOR_NOT_FOUND")
      return NextResponse.json(
        { error: "The requested item was not found." },
        { status: 404 },
      );
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return NextResponse.json(
        { error: "This source is already connected." },
        { status: 409 },
      );
    console.error("Action failed", error);
    return NextResponse.json(
      { error: "The change could not be saved. Please try again." },
      { status: 500 },
    );
  }
}

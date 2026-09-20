import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitorSchema, sourceSchema } from "@/lib/validation";
import { rebuildMatches, syncSources } from "@/lib/sync";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    await authorizeWrite(request);
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
          "sync",
        ]),
        id: z.string().uuid().optional(),
        data: z.unknown().optional(),
      })
      .parse(await request.json());
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
      await db().query("UPDATE jobs SET status=$2 WHERE id=$1", [id, status]);
    } else {
      const client = await db().connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(741210)");
        if (body.action === "monitor-delete")
          await client.query("DELETE FROM monitors WHERE id=$1", [
            z.string().uuid().parse(body.id),
          ]);
        else {
          const v = monitorSchema.parse(body.data);
          if (body.id)
            await client.query(
              "UPDATE monitors SET name=$2,keywords=$3,excluded_keywords=$4,location=$5,remote_only=$6,enabled=$7 WHERE id=$1",
              [
                body.id,
                v.name,
                v.keywords,
                v.excludedKeywords,
                v.location,
                v.remoteOnly,
                v.enabled,
              ],
            );
          else
            await client.query(
              "INSERT INTO monitors(name,keywords,excluded_keywords,location,remote_only,enabled) VALUES($1,$2,$3,$4,$5,$6)",
              [
                v.name,
                v.keywords,
                v.excludedKeywords,
                v.location,
                v.remoteOnly,
                v.enabled,
              ],
            );
        }
        await rebuildMatches(client);
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
        { error: "Sign in as the workspace owner to make changes." },
        { status: 401 },
      );
    if (message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Request origin is not allowed. Check APP_URL." },
        { status: 403 },
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

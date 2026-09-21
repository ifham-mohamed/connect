import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { rebuildMatches } from "@/lib/sync";
import { onboardingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 30000)
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });

    const user = await authorizeWrite(request);
    const preferences = onboardingSchema.parse(await request.json());
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(741210)");
      await client.query("DELETE FROM monitors WHERE user_id=$1", [user.id]);
      for (const monitor of preferences.monitors) {
        await client.query(
          `INSERT INTO monitors(user_id,name,keywords,excluded_keywords,location,remote_only,enabled)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            user.id,
            monitor.name,
            monitor.keywords,
            monitor.excludedKeywords,
            monitor.location,
            monitor.remoteOnly,
            monitor.enabled,
          ],
        );
      }
      await client.query(
        "UPDATE users SET preferences=$2::jsonb,onboarding_completed_at=now() WHERE id=$1",
        [
          user.id,
          JSON.stringify({
            experience: preferences.experience,
            roles: preferences.roles,
            locations: preferences.locations,
            workModes: preferences.workModes,
          }),
        ],
      );
      await rebuildMatches(client);
      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Check your preferences." },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    if (message === "FORBIDDEN")
      return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
    console.error("Onboarding failed", error);
    return NextResponse.json(
      { error: "Your preferences could not be saved. Please try again." },
      { status: 500 },
    );
  }
}

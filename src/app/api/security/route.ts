import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeWrite,
  currentSessionToken,
  currentUser,
  hashSessionToken,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { recordSecurityEvent } from "@/lib/security";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "Security activity is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client, request);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const tokenHash = hashSessionToken(await currentSessionToken());
    const [sessions, events] = await Promise.all([
      client.query(
        `SELECT id,created_at AS "createdAt",last_seen_at AS "lastSeenAt",expires_at AS "expiresAt",
                left(COALESCE(user_agent_hash,''),12) AS "deviceId",
                left(COALESCE(ip_hash,''),12) AS "networkId",
                (token_hash=$2) AS current
           FROM user_sessions
          WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()
          ORDER BY last_seen_at DESC LIMIT 20`,
        [user.id, tokenHash],
      ),
      client.query(
        `SELECT event.id,event.event_type AS "eventType",event.severity,event.route,
                left(COALESCE(event.user_agent_hash,''),12) AS "deviceId",
                left(COALESCE(event.ip_hash,''),12) AS "networkId",event.metadata,
                event.created_at AS "createdAt",account.name AS "accountName",account.email AS "accountEmail"
           FROM security_events event
           LEFT JOIN users account ON account.id=event.user_id
          WHERE event.user_id=$1 OR ($2='owner' AND event.severity IN ('warning','critical'))
          ORDER BY event.created_at DESC LIMIT 50`,
        [user.id, user.role],
      ),
    ]);
    return NextResponse.json(
      { sessions: sessions.rows, events: events.rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Security activity read failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "Security activity is temporarily unavailable." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await authorizeWrite(request);
    const input = z
      .object({ sessionId: z.string().uuid() })
      .parse(await readJsonBody(request, 2_000));
    const currentHash = hashSessionToken(await currentSessionToken());
    const removed = await db().query<{ current: boolean }>(
      `UPDATE user_sessions SET revoked_at=now()
        WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL
        RETURNING token_hash=$3 AS current`,
      [input.sessionId, user.id, currentHash],
    );
    if (!removed.rowCount)
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    await recordSecurityEvent({
      request,
      eventType: "session.revoked_by_user",
      severity: "info",
      userId: user.id,
      sessionId: input.sessionId,
      metadata: { current: removed.rows[0].current },
    });
    return NextResponse.json({ ok: true, current: removed.rows[0].current });
  } catch (error) {
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (message === "FORBIDDEN")
      return NextResponse.json({ error: "Request denied." }, { status: 403 });
    return NextResponse.json(
      { error: "The session could not be revoked." },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import { currentUser } from "./auth";
import { withDatabaseRetry } from "./db";
import type { PoolClient } from "pg";
import type { AuthUser } from "./auth";
import { incrementUsage } from "./revisions";

export async function authenticatedRead<T>(
  request: Request,
  handler: (client: PoolClient, user: AuthUser) => Promise<T>,
  owner = false,
) {
  try {
    return await withDatabaseRetry(async (client) => {
      const user = await currentUser(client, request);
      if (!user)
        return NextResponse.json({ error: "Sign in first." }, { status: 401 });
      if (owner && user.role !== "owner")
        return NextResponse.json(
          { error: "Owner access required." },
          { status: 403 },
        );
      const started = performance.now();
      const payload = JSON.stringify(await handler(client, user));
      const duration = Math.round(performance.now() - started);
      if (Math.random() < 0.05) {
        const route = new URL(request.url).pathname.replace(
          /\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
          "/:id",
        );
        await incrementUsage(client, `api.${route}.calls_estimated`, 20);
        await incrementUsage(
          client,
          `api.${route}.bytes_estimated`,
          Buffer.byteLength(payload) * 20,
        );
      }
      return new NextResponse(payload, {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(payload)),
          "Server-Timing": `db;dur=${duration}`,
          "Cache-Control": "private, no-store",
        },
      });
    });
  } catch (error) {
    console.error(
      "Focused read failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "The requested data is temporarily unavailable." },
      { status: 503 },
    );
  }
}

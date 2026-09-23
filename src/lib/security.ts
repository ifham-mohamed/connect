import { createHmac } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";

type Queryable = Pick<Pool | PoolClient, "query">;
export type SecuritySeverity = "info" | "warning" | "critical";

function auditKey() {
  return process.env.SECURITY_AUDIT_SECRET || process.env.CRON_SECRET || "";
}

function digest(value: string) {
  const key = auditKey();
  if (!key || !value) return null;
  return createHmac("sha256", key).update(value).digest("hex");
}

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name)?.split(",")[0]?.trim();
    if (value) return value.slice(0, 512);
  }
  return "";
}

export function requestSecurityContext(request: Request) {
  const ip = firstHeader(request.headers, [
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
  ]);
  const device = [
    request.headers.get("user-agent") || "",
    request.headers.get("sec-ch-ua-platform") || "",
    request.headers.get("accept-language") || "",
  ].join("|");
  let route = "";
  try {
    route = new URL(request.url).pathname.slice(0, 240);
  } catch {
    route = "unknown";
  }
  return { ipHash: digest(ip), userAgentHash: digest(device), route };
}

export async function recordSecurityEvent({
  request,
  eventType,
  severity,
  userId = null,
  sessionId = null,
  metadata = {},
  queryable,
}: {
  request: Request;
  eventType: string;
  severity: SecuritySeverity;
  userId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  queryable?: Queryable;
}) {
  const context = requestSecurityContext(request);
  try {
    await (queryable || db()).query(
      `INSERT INTO security_events(user_id,session_id,event_type,severity,route,ip_hash,user_agent_hash,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        userId,
        sessionId,
        eventType.slice(0, 80),
        severity,
        context.route,
        context.ipHash,
        context.userAgentHash,
        JSON.stringify(metadata),
      ],
    );
  } catch (error) {
    console.error(
      "Security audit write failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}

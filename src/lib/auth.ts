import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import type { Pool, PoolClient } from "pg";
import { db } from "./db";
import { recordSecurityEvent, requestSecurityContext } from "./security";
import { consumeRateLimit, RateLimitError } from "./rate-limit";
import type { UserPreferences } from "./types";

const scrypt = promisify(scryptCallback);
export const sessionCookie = "jobradar_session";
export const sessionMaxAge = 7 * 24 * 60 * 60;

export type UserRole = "owner" | "member";
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
}
type Queryable = Pick<Pool | PoolClient, "query">;

export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !encoded) return false;
  try {
    const expected = Buffer.from(encoded, "hex");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}
export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function setSessionCookie(token: string) {
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      (process.env.APP_URL?.startsWith("https://") ?? false),
    sameSite: "strict",
    path: "/",
    maxAge: sessionMaxAge,
    priority: "high",
  });
}
export async function clearSessionCookie() {
  (await cookies()).delete(sessionCookie);
}
export async function currentSessionToken() {
  return (await cookies()).get(sessionCookie)?.value || "";
}
export async function currentUser(
  queryable?: Queryable,
  request?: Request,
): Promise<AuthUser | null> {
  const token = await currentSessionToken();
  if (!token) return null;
  const connection = queryable || db();
  const result = await connection.query<
    AuthUser & {
      sessionId: string;
      ipHash: string | null;
      userAgentHash: string | null;
      lastSeenAt: Date;
    }
  >(
    `SELECT u.id, u.name, u.email, u.role,s.id AS "sessionId",s.last_seen_at AS "lastSeenAt",
            s.ip_hash AS "ipHash",s.user_agent_hash AS "userAgentHash",
            (u.onboarding_completed_at IS NOT NULL) AS "onboardingCompleted",
            u.preferences
       FROM user_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL LIMIT 1`,
    [hashSessionToken(token)],
  );
  const user = result.rows[0];
  if (!user) return null;
  let securityRequest = request;
  if (!securityRequest) {
    const incoming = await headers();
    securityRequest = new Request(process.env.APP_URL || "http://localhost", {
      headers: incoming,
    });
  }
  if (securityRequest) {
    const context = requestSecurityContext(securityRequest);
    if (
      user.userAgentHash &&
      context.userAgentHash &&
      user.userAgentHash !== context.userAgentHash
    ) {
      await connection.query(
        "UPDATE user_sessions SET revoked_at=now() WHERE id=$1",
        [user.sessionId],
      );
      await recordSecurityEvent({
        request: securityRequest,
        eventType: "session.device_mismatch",
        severity: "critical",
        userId: user.id,
        sessionId: user.sessionId,
        queryable: connection,
      });
      return null;
    }
    const touchDue =
      Date.now() - new Date(user.lastSeenAt).getTime() >= 15 * 60_000;
    if (
      touchDue &&
      user.ipHash &&
      context.ipHash &&
      user.ipHash !== context.ipHash
    ) {
      await recordSecurityEvent({
        request: securityRequest,
        eventType: "session.network_changed",
        severity: "warning",
        userId: user.id,
        sessionId: user.sessionId,
        queryable: connection,
      });
    }
    if (touchDue)
      await connection.query(
        `UPDATE user_sessions SET last_seen_at=now(),
              ip_hash=COALESCE($2,ip_hash),user_agent_hash=COALESCE($3,user_agent_hash)
        WHERE id=$1`,
        [user.sessionId, context.ipHash, context.userAgentHash],
      );
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    onboardingCompleted: user.onboardingCompleted,
    preferences: user.preferences,
  };
}

export function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  let applicationOrigin = "";
  try {
    if (process.env.APP_URL)
      applicationOrigin = new URL(process.env.APP_URL).origin;
    else if (process.env.NODE_ENV !== "production")
      applicationOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }
  return Boolean(origin && applicationOrigin && origin === applicationOrigin);
}

function writeLimit(pathname: string) {
  if (pathname === "/api/onboarding") return { limit: 12, seconds: 600 };
  if (pathname === "/api/ai-usage") return { limit: 10, seconds: 300 };
  if (pathname === "/api/intelligence") return { limit: 30, seconds: 300 };
  if (pathname === "/api/security") return { limit: 20, seconds: 300 };
  if (pathname.includes("/cv-review")) return { limit: 20, seconds: 60 };
  if (pathname.includes("/image-context")) return { limit: 20, seconds: 300 };
  if (pathname === "/api/candidate/cv") return { limit: 20, seconds: 300 };
  return { limit: 120, seconds: 60 };
}
export async function authorizeWrite(
  request: Request,
  requiredRole: UserRole = "member",
) {
  if (!originAllowed(request)) {
    await recordSecurityEvent({
      request,
      eventType: "authorization.origin_denied",
      severity: "warning",
    });
    throw new Error("FORBIDDEN");
  }
  const user = await currentUser(undefined, request);
  if (!user) {
    await recordSecurityEvent({
      request,
      eventType: "authorization.authentication_required",
      severity: "warning",
    });
    throw new Error("UNAUTHORIZED");
  }
  if (requiredRole === "owner" && user.role !== "owner") {
    await recordSecurityEvent({
      request,
      eventType: "authorization.role_denied",
      severity: "critical",
      userId: user.id,
      metadata: { requiredRole },
    });
    throw new Error("OWNER_REQUIRED");
  }
  const pathname = new URL(request.url).pathname;
  const policy = writeLimit(pathname);
  const rate = await consumeRateLimit(
    db(),
    `${request.method}:${pathname}`,
    user.id,
    policy.limit,
    policy.seconds,
  );
  if (!rate.allowed) {
    await recordSecurityEvent({
      request,
      eventType: "authorization.rate_limited",
      severity: "warning",
      userId: user.id,
      metadata: { limit: policy.limit, windowSeconds: policy.seconds },
    });
    throw new RateLimitError(rate.retryAfter, rate.limit);
  }
  return user;
}

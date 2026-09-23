import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  createSessionToken,
  currentSessionToken,
  hashPassword,
  hashSessionToken,
  originAllowed,
  sessionMaxAge,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { connectDatabase, db } from "@/lib/db";
import { databaseError } from "@/lib/database-error";
import { recordSecurityEvent, requestSecurityContext } from "@/lib/security";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const dummyPasswordHash =
  "scrypt$00000000000000000000000000000000$6aecd6ad6c94ef43ca3435acbc08bf9a2eb0c9502ef46fae86340b2cb3f7bf42e438f1312ec09d7c3a62647beaa6d42a4f9772e8c0875f28074022c3f5c70605";

const credentialsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("sign-in"),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  }),
  z.object({
    mode: z.literal("sign-up"),
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128)
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
  }),
]);

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    await recordSecurityEvent({
      request,
      eventType: "authentication.origin_denied",
      severity: "warning",
    });
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  }
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Configure the workspace database first." },
      { status: 503 },
    );
  let body: unknown;
  try {
    body = await readJsonBody(request, 4096);
  } catch (error) {
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    throw error;
  }
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    await recordSecurityEvent({
      request,
      eventType: "authentication.invalid_input",
      severity: "warning",
      metadata: { mode: "unknown" },
    });
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check your account details.",
      },
      { status: 400 },
    );
  }
  const client = await connectDatabase().catch((error) => {
    console.error("Authentication connection failed", databaseError(error));
    return null;
  });
  if (!client)
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const { email, password } = parsed.data;
    const securityContext = requestSecurityContext(request);
    const bucket = `account:${hashSessionToken(email).slice(0, 32)}`;
    const attempt = await client.query<{ attempts: number }>(
      `INSERT INTO auth_attempts(bucket,attempts,reset_at) VALUES($1,1,now()+interval '5 minutes')
       ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,
       reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '5 minutes' ELSE auth_attempts.reset_at END RETURNING attempts`,
      [bucket],
    );
    let networkAttempts = 0;
    if (securityContext.ipHash) {
      const networkAttempt = await client.query<{ attempts: number }>(
        `INSERT INTO auth_attempts(bucket,attempts,reset_at) VALUES($1,1,now()+interval '5 minutes')
         ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,
         reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '5 minutes' ELSE auth_attempts.reset_at END RETURNING attempts`,
        [`network:${securityContext.ipHash}`],
      );
      networkAttempts = networkAttempt.rows[0]?.attempts || 0;
    }
    if ((attempt.rows[0]?.attempts || 0) > 10 || networkAttempts > 40) {
      await recordSecurityEvent({
        request,
        eventType: "authentication.rate_limited",
        severity: "critical",
        metadata: { mode: parsed.data.mode },
        queryable: client,
      });
      return NextResponse.json(
        { error: "Too many attempts. Try again in five minutes." },
        { status: 429 },
      );
    }

    let user: {
      id: string;
      name: string;
      email: string;
      role: "owner" | "member";
      onboardingCompleted: boolean;
      preferences: Record<string, unknown>;
    };
    await client.query("BEGIN");
    if (parsed.data.mode === "sign-up") {
      await client.query("SELECT pg_advisory_xact_lock(741212)");
      const existing = await client.query(
        "SELECT 1 FROM users WHERE lower(email)=lower($1)",
        [email],
      );
      if (existing.rowCount) {
        await client.query("ROLLBACK");
        await recordSecurityEvent({
          request,
          eventType: "authentication.signup_rejected",
          severity: "warning",
          queryable: client,
        });
        return NextResponse.json(
          { error: "An account could not be created with these details." },
          { status: 409 },
        );
      }
      const count = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM users",
      );
      const role = count.rows[0]?.count === 0 ? "owner" : "member";
      const created = await client.query<typeof user>(
        `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)
         RETURNING id,name,email,role,false AS "onboardingCompleted",preferences`,
        [parsed.data.name, email, await hashPassword(password), role],
      );
      user = created.rows[0];
      if (role === "owner")
        await client.query(
          "UPDATE monitors SET user_id=$1 WHERE user_id IS NULL",
          [user.id],
        );
    } else {
      const found = await client.query<typeof user & { passwordHash: string }>(
        `SELECT id,name,email,role,password_hash AS "passwordHash",
                (onboarding_completed_at IS NOT NULL) AS "onboardingCompleted",preferences
           FROM users WHERE lower(email)=lower($1) LIMIT 1`,
        [email],
      );
      const candidate = found.rows[0];
      const passwordMatches = await verifyPassword(
        password,
        candidate?.passwordHash || dummyPasswordHash,
      );
      if (!candidate || !passwordMatches) {
        await client.query("ROLLBACK");
        await recordSecurityEvent({
          request,
          eventType: "authentication.login_failed",
          severity: "warning",
          queryable: client,
        });
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      }
      user = candidate;
    }
    const token = createSessionToken();
    await client.query(
      `INSERT INTO user_sessions(user_id,token_hash,expires_at,ip_hash,user_agent_hash)
       VALUES($1,$2,now()+($3 * interval '1 second'),$4,$5)`,
      [
        user.id,
        hashSessionToken(token),
        sessionMaxAge,
        securityContext.ipHash,
        securityContext.userAgentHash,
      ],
    );
    await client.query("DELETE FROM auth_attempts WHERE bucket=$1", [bucket]);
    if (securityContext.ipHash)
      await client.query("DELETE FROM auth_attempts WHERE bucket=$1", [
        `network:${securityContext.ipHash}`,
      ]);
    await client.query("DELETE FROM user_sessions WHERE expires_at<=now()");
    await client.query(
      "DELETE FROM security_events WHERE created_at<now()-interval '90 days'",
    );
    await recordSecurityEvent({
      request,
      eventType:
        parsed.data.mode === "sign-up"
          ? "authentication.signup_succeeded"
          : "authentication.login_succeeded",
      severity: "info",
      userId: user.id,
      metadata: { role: user.role },
      queryable: client,
    });
    await client.query("COMMIT");
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Authentication failed", error);
    return NextResponse.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  if (!originAllowed(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  const token = await currentSessionToken();
  if (token && process.env.DATABASE_URL) {
    const user = await db()
      .query<{ userId: string; sessionId: string }>(
        `SELECT user_id AS "userId",id AS "sessionId" FROM user_sessions WHERE token_hash=$1`,
        [hashSessionToken(token)],
      )
      .then((result) => result.rows[0])
      .catch(() => null);
    if (user)
      await recordSecurityEvent({
        request,
        eventType: "authentication.logout",
        severity: "info",
        userId: user.userId,
        sessionId: user.sessionId,
      });
    await db()
      .query("DELETE FROM user_sessions WHERE token_hash=$1", [
        hashSessionToken(token),
      ])
      .catch((error) => console.error("Session cleanup failed", error));
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

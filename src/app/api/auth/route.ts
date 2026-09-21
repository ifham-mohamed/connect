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
import { db } from "@/lib/db";

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
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 },
    );
  if (!originAllowed(request))
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Configure the workspace database first." },
      { status: 503 },
    );
  const parsed = credentialsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Check your account details.",
      },
      { status: 400 },
    );
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const { email, password } = parsed.data;
    const bucket = `account:${hashSessionToken(email).slice(0, 32)}`;
    const attempt = await client.query<{ attempts: number }>(
      `INSERT INTO auth_attempts(bucket,attempts,reset_at) VALUES($1,1,now()+interval '5 minutes')
       ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,
       reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '5 minutes' ELSE auth_attempts.reset_at END RETURNING attempts`,
      [bucket],
    );
    if ((attempt.rows[0]?.attempts || 0) > 10)
      return NextResponse.json(
        { error: "Too many attempts. Try again in five minutes." },
        { status: 429 },
      );

    let user: {
      id: string;
      name: string;
      email: string;
      role: "owner" | "member";
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
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 },
        );
      }
      const count = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM users",
      );
      const role = count.rows[0]?.count === 0 ? "owner" : "member";
      const created = await client.query<typeof user>(
        `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role`,
        [parsed.data.name, email, await hashPassword(password), role],
      );
      user = created.rows[0];
    } else {
      const found = await client.query<typeof user & { passwordHash: string }>(
        `SELECT id,name,email,role,password_hash AS "passwordHash" FROM users WHERE lower(email)=lower($1) LIMIT 1`,
        [email],
      );
      const candidate = found.rows[0];
      if (
        !candidate ||
        !(await verifyPassword(password, candidate.passwordHash))
      ) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
      }
      user = candidate;
    }
    const token = createSessionToken();
    await client.query(
      `INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+($3 * interval '1 second'))`,
      [user.id, hashSessionToken(token), sessionMaxAge],
    );
    await client.query("DELETE FROM auth_attempts WHERE bucket=$1", [bucket]);
    await client.query("DELETE FROM user_sessions WHERE expires_at<=now()");
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
  if (token && process.env.DATABASE_URL)
    await db()
      .query("DELETE FROM user_sessions WHERE token_hash=$1", [
        hashSessionToken(token),
      ])
      .catch((error) => console.error("Session cleanup failed", error));
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

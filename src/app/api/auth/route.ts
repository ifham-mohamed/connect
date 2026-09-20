import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, equalSecret, authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL || request.url).origin
  )
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 },
    );
  if (
    !process.env.DATABASE_URL ||
    !process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD.length < 16 ||
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
  )
    return NextResponse.json(
      {
        error:
          "Configure the database, a 16-character admin password, and a 32-character session secret first.",
      },
      { status: 503 },
    );
  try {
    // A database-backed global limit works across serverless instances; proxy IP headers are not trusted.
    const attempt = await db().query(
      `INSERT INTO auth_attempts(bucket,attempts,reset_at) VALUES('admin',1,now()+interval '5 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '5 minutes' ELSE auth_attempts.reset_at END RETURNING attempts`,
    );
    if (attempt.rows[0].attempts > 10)
      return NextResponse.json(
        { error: "Too many sign-in attempts. Try again in five minutes." },
        { status: 429 },
      );
    const body = await request.json();
    if (
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      !equalSecret(body.password, process.env.ADMIN_PASSWORD)
    )
      return NextResponse.json(
        { error: "Incorrect workspace password." },
        { status: 401 },
      );
    (await cookies()).set("jobradar_session", createSession(), {
      httpOnly: true,
      secure: process.env.APP_URL?.startsWith("https://") ?? false,
      sameSite: "strict",
      path: "/",
      maxAge: 12 * 3600,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sign in failed", error);
    return NextResponse.json(
      { error: "Sign in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    await authorizeWrite(request);
    (await cookies()).delete("jobradar_session");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
}

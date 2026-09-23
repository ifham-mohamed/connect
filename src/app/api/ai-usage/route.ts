import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWrite, currentUser } from "@/lib/auth";
import { getAiUsage, memberUsageSummary } from "@/lib/ai-usage";
import { db } from "@/lib/db";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { recordSecurityEvent } from "@/lib/security";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getWorkspaceAiBudget } from "@/lib/ai-budget";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "AI usage is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client, request);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const usage = await getAiUsage(client, user);
    return NextResponse.json(
      {
        usage,
        memberSummary:
          user.role === "owner" ? await memberUsageSummary(client) : null,
        workspaceBudget:
          user.role === "owner" ? await getWorkspaceAiBudget(client) : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    console.error(
      "AI usage read failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "AI usage is temporarily unavailable." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authorizeWrite(request, "owner");
    const input = z
      .object({
        memberDailyJobAnalysisLimit: z.number().int().min(1).max(100),
        backgroundEnabled: z.boolean().default(false),
        monthlyRequestLimit: z.number().int().min(1).max(100000).default(500),
        monthlyTokenLimit: z
          .number()
          .int()
          .min(1000)
          .max(100000000)
          .default(1000000),
      })
      .parse(await readJsonBody(request, 2_000));
    await db().query(
      `INSERT INTO ai_usage_policy(singleton,member_daily_job_analysis_limit,updated_by,updated_at)
       VALUES(true,$1,$2,now())
       ON CONFLICT(singleton) DO UPDATE SET
         member_daily_job_analysis_limit=excluded.member_daily_job_analysis_limit,
         updated_by=excluded.updated_by,updated_at=now()`,
      [input.memberDailyJobAnalysisLimit, user.id],
    );
    await db().query(
      `UPDATE ai_workspace_budget SET background_enabled=$1,monthly_request_limit=$2,
        monthly_token_limit=$3,paused_reason=NULL,updated_at=now() WHERE singleton=true`,
      [
        input.backgroundEnabled,
        input.monthlyRequestLimit,
        input.monthlyTokenLimit,
      ],
    );
    await recordSecurityEvent({
      request,
      eventType: "ai.policy_updated",
      severity: "info",
      userId: user.id,
      metadata: {
        memberDailyJobAnalysisLimit: input.memberDailyJobAnalysisLimit,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Choose a valid daily limit." },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (message === "OWNER_REQUIRED" || message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Only the workspace owner can change AI limits." },
        { status: 403 },
      );
    console.error(
      "AI usage policy update failed",
      error instanceof Error ? error.message : "unknown",
    );
    return NextResponse.json(
      { error: "The AI usage policy could not be saved." },
      { status: 503 },
    );
  }
}

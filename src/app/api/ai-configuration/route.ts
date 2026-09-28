import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeWrite } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserJevApiKey } from "@/lib/user-jev-key";
import {
  createJevClient,
  jevConnectionMessage,
  testJevConnection,
} from "@/lib/jev/client";
import { jevConfig, platformJevConfig } from "@/lib/jev/config";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { rateLimitResponse } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: Request) {
  let config: ReturnType<typeof jevConfig> | null = null;
  try {
    const body = z
      .object({ mode: z.enum(["platform", "personal"]).optional() })
      .parse(await readJsonBody(request, 2_000));
    const user = await authorizeWrite(request);
    const mode =
      body.mode ??
      user.preferences.aiCredentialMode ??
      (user.jevApiKeyConfigured ? "personal" : "platform");

    if (mode === "personal") {
      const apiKey = await getUserJevApiKey(db(), user.id);
      if (!apiKey) {
        return NextResponse.json(
          { error: "Add and save a personal JEV API key before testing it." },
          { status: 400 },
        );
      }
      const base = jevConfig({ ...process.env, JEV_MODE: "off" });
      config = { ...base, apiKey };
    } else {
      config = platformJevConfig();
      if (!config) {
        return NextResponse.json(
          { error: "Workspace AI is not configured." },
          { status: 503 },
        );
      }
    }

    const result = await testJevConnection(createJevClient(config), config);
    if (!result.modelAvailable)
      return NextResponse.json({
        ok: true,
        status: "warning",
        source: mode,
        model: config.model,
        ...result,
        message: `The credential is valid, but ${config.model} is not available to it. Check model access before enabling AI analysis.`,
      });
    return NextResponse.json({
      ok: true,
      status: "healthy",
      source: mode,
      model: config.model,
      ...result,
      message: `${mode === "platform" ? "Workspace AI" : "Your personal key"} is connected and ready.`,
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) return limited;
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED")
      return NextResponse.json(
        { error: "Sign in to test AI configuration." },
        { status: 401 },
      );
    if (message === "FORBIDDEN")
      return NextResponse.json(
        { error: "Request origin is not allowed. Check APP_URL." },
        { status: 403 },
      );
    if (message === "JEV_KEY_ENCRYPTION_NOT_CONFIGURED")
      return NextResponse.json(
        {
          error:
            "Secure key storage is not configured. Contact the workspace owner.",
        },
        { status: 503 },
      );
    if (config)
      return NextResponse.json(
        { error: jevConnectionMessage(error, config) },
        { status: 502 },
      );
    console.error("AI configuration test failed", error);
    return NextResponse.json(
      { error: "The AI configuration could not be tested." },
      { status: 500 },
    );
  }
}

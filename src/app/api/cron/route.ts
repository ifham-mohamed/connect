import { NextResponse } from "next/server";
import { equalSecret } from "@/lib/auth";
import { syncSources } from "@/lib/sync";
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 24 ||
    !equalSecret(request.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncSources());
  } catch (error) {
    console.error("Scheduled collection failed", error);
    return NextResponse.json({ error: "Collection failed" }, { status: 503 });
  }
}

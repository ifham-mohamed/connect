import { NextResponse } from "next/server";
import { equalSecret } from "@/lib/auth";
import { workerDb } from "@/lib/db";

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    secret.length < 24 ||
    !equalSecret(request.headers.get("authorization") || "", `Bearer ${secret}`)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await workerDb().query(
      "SELECT * FROM jobradar_apply_retention()",
    );
    return NextResponse.json({ ok: true, retention: result.rows[0] });
  } catch (error) {
    console.error("Retention failed", error);
    return NextResponse.json({ error: "Maintenance failed" }, { status: 503 });
  }
}

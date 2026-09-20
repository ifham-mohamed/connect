import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ status: "demo", database: false });
  try {
    await db().query("SELECT id FROM sources LIMIT 1");
    return NextResponse.json({ status: "ok", database: true });
  } catch {
    return NextResponse.json(
      { status: "unavailable", database: false },
      { status: 503 },
    );
  }
}

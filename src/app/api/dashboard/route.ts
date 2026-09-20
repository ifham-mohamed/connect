import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { getDashboard } from "@/lib/repository";
import { demoData } from "@/lib/demo";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json(demoData());
  try {
    return NextResponse.json(await getDashboard(await authenticated()));
  } catch (error) {
    console.error("Dashboard read failed", error);
    return NextResponse.json(
      {
        error:
          "Could not reach the database. Check the connection and run the database migration.",
      },
      { status: 503 },
    );
  }
}

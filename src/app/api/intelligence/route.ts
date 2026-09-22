import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIntelligenceHealth } from "@/lib/intelligence/report";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await db()
    .connect()
    .catch(() => null);
  if (!client)
    return NextResponse.json(
      { error: "The workspace database is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client);
    if (!user)
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (user.role !== "owner")
      return NextResponse.json(
        { error: "Only the workspace owner can view JEV health." },
        { status: 403 },
      );
    return NextResponse.json(await getIntelligenceHealth(client));
  } catch (error) {
    console.error("JEV health read failed", error);
    return NextResponse.json(
      { error: "JEV health is temporarily unavailable." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

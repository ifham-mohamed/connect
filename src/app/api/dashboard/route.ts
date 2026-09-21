import { NextResponse } from "next/server";
import { currentSessionToken, currentUser } from "@/lib/auth";
import { getDashboard } from "@/lib/repository";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await currentSessionToken()))
    return NextResponse.json(
      { error: "Sign in to open this workspace.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Configure the workspace database and run its migrations." },
      { status: 503 },
    );
  const client = await db()
    .connect()
    .catch((error) => {
      console.error("Dashboard connection failed", error);
      return null;
    });
  if (!client)
    return NextResponse.json(
      { error: "The workspace database is temporarily unavailable." },
      { status: 503 },
    );
  try {
    const user = await currentUser(client);
    if (!user)
      return NextResponse.json(
        { error: "Sign in to open this workspace.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    return NextResponse.json(await getDashboard(user, client));
  } catch (error) {
    console.error("Dashboard read failed", error);
    return NextResponse.json(
      {
        error:
          "Could not reach the database. Check the connection and run the database migration.",
      },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

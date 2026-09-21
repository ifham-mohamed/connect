import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJobDetail } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!parsed.success)
    return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const client = await db()
    .connect()
    .catch((error) => {
      console.error("Job detail connection failed", error);
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
        { error: "Sign in to continue." },
        { status: 401 },
      );
    const job = await getJobDetail(user, parsed.data, client);
    if (!job)
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    console.error("Job detail read failed", error);
    return NextResponse.json(
      { error: "The opportunity could not be loaded." },
      { status: 503 },
    );
  } finally {
    client.release();
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedRead } from "@/lib/api-read";
import { decodeCursor, listRunJobs } from "@/lib/focused-repository";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).nullable(),
  scope: z.enum(["all", "new"]).default("all"),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Invalid run." }, { status: 400 });
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") || undefined,
    cursor: url.searchParams.get("cursor"),
    scope: url.searchParams.get("scope") || "all",
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid run filters." },
      { status: 400 },
    );
  const cursor = decodeCursor(parsed.data.cursor);
  if (parsed.data.cursor && !cursor)
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  return authenticatedRead(
    request,
    (client, user) =>
      listRunJobs(client, user.id, id, {
        limit: parsed.data.limit,
        cursor,
        onlyNew: parsed.data.scope === "new",
      }),
    true,
  );
}

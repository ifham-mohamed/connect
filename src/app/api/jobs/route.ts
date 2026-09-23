import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedRead } from "@/lib/api-read";
import { decodeCursor, listJobs } from "@/lib/focused-repository";
export const dynamic = "force-dynamic";
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).nullable(),
  search: z.string().trim().max(120).default(""),
  status: z.enum(["all", "new", "saved", "applied", "archived"]).default("all"),
  monitor: z.union([z.literal("all"), z.string().uuid()]).default("all"),
  source: z.union([z.literal("all"), z.string().uuid()]).default("all"),
  matched: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  location: z.string().trim().max(120).default(""),
  mode: z.enum(["all", "onsite", "hybrid", "remote"]).default("all"),
});
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") || undefined,
    cursor: url.searchParams.get("cursor"),
    search: url.searchParams.get("q") || "",
    status: url.searchParams.get("status") || "all",
    monitor: url.searchParams.get("monitor") || "all",
    source: url.searchParams.get("source") || "all",
    matched: url.searchParams.get("matched") || "false",
    location: url.searchParams.get("location") || "",
    mode: url.searchParams.get("mode") || "all",
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid job filters." },
      { status: 400 },
    );
  const cursor = decodeCursor(parsed.data.cursor);
  if (parsed.data.cursor && !cursor)
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  return authenticatedRead(request, (client, user) =>
    listJobs(client, user, { ...parsed.data, cursor }),
  );
}

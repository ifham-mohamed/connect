import { currentUser } from "@/lib/auth";
import { connectDatabase } from "@/lib/db";
import { getRevisions } from "@/lib/revisions";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const client = await connectDatabase();
  try {
    const user = await currentUser(client, request);
    if (!user)
      return Response.json({ error: "Sign in first." }, { status: 401 });
    const revisions = await getRevisions(client, user.id);
    const etag = `\"${Object.entries(revisions)
      .sort()
      .map(([k, v]) => `${k}:${v}`)
      .join("|")}\"`;
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers: { ETag: etag } });
    return Response.json({ revisions }, { headers: { ETag: etag } });
  } finally {
    client.release();
  }
}

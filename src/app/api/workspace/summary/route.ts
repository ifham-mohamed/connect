import { authenticatedRead } from "@/lib/api-read";
import { workspaceSummary } from "@/lib/focused-repository";
import { getRevisions } from "@/lib/revisions";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return authenticatedRead(request, async (client, user) => ({
    ...(await workspaceSummary(client, user)),
    revisions: await getRevisions(client, user.id),
  }));
}

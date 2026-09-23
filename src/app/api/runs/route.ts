import { authenticatedRead } from "@/lib/api-read";
import { listRuns } from "@/lib/focused-repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return authenticatedRead(request, (client) => listRuns(client), true);
}

import { authenticatedRead } from "@/lib/api-read";
import { listSources } from "@/lib/focused-repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return authenticatedRead(request, (client) => listSources(client), true);
}

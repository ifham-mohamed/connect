import { authenticatedRead } from "@/lib/api-read";
import { listMonitors } from "@/lib/focused-repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return authenticatedRead(request, (client, user) =>
    listMonitors(client, user.id),
  );
}

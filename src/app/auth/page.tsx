import { AuthPage } from "@/components/auth/auth-page";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function WorkspaceAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const query = await searchParams;
  const user = await currentUser().catch(() => null);
  if (user) {
    redirect(query.next?.startsWith("/app/") ? query.next : "/app/dashboard");
  }
  return <AuthPage initialMode={query.mode === "sign-up" ? "sign-up" : "sign-in"} />;
}

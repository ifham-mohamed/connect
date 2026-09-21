import { AuthPage } from "@/components/auth/auth-page";

export default async function WorkspaceAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const query = await searchParams;
  return <AuthPage initialMode={query.mode === "sign-up" ? "sign-up" : "sign-in"} />;
}

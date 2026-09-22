import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitorSelect } from "@/lib/repository";
import type { Monitor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const query = await searchParams;
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/auth?next=/onboarding");
  const editMode = query.edit === "1";
  if (user.onboardingCompleted && !editMode) redirect("/app/dashboard");
  const monitors = editMode
    ? (await db().query<Monitor>(`${monitorSelect} WHERE user_id=$1 ORDER BY created_at`, [user.id])).rows
    : [];
  return (
    <OnboardingFlow
      userName={user.name}
      userRole={user.role}
      editMode={editMode}
      initialPreferences={user.preferences}
      initialMonitors={monitors}
    />
  );
}

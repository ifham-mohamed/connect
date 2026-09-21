import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await currentUser().catch(() => null);
  if (!user) redirect("/auth?next=/onboarding");
  if (user.onboardingCompleted) redirect("/app/dashboard");
  return <OnboardingFlow userName={user.name} />;
}

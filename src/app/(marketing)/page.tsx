import { LandingPage } from "@/components/landing/landing-page";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser().catch(() => null);
  if (user) {
    redirect(user.onboardingCompleted ? "/app/dashboard" : "/onboarding");
  }
  return <LandingPage user={user} />;
}

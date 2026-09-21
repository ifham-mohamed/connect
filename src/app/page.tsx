import { LandingPage } from "@/components/landing/landing-page";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser().catch(() => null);
  return <LandingPage user={user} />;
}

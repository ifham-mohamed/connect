import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { currentUser } from "@/lib/auth";
import { connectDatabase } from "@/lib/db";
import { workspaceSummary } from "@/lib/focused-repository";
import { getRevisions } from "@/lib/revisions";
import type { DashboardData } from "@/lib/types";

import type { View } from "@/components/dashboard/shared";

export default async function WorkspacePage({ view }: { view: View }) {
  const client = await connectDatabase();
  try {
    const user = await currentUser(client);
    if (!user)
      redirect(`/auth?next=/app/${view === "overview" ? "dashboard" : view}`);
    if (!user.onboardingCompleted) redirect("/onboarding");
    const deferredResources: Array<"jobs" | "monitors" | "sources" | "runs"> = [
      "jobs",
      "monitors",
      "sources",
      "runs",
    ];

    const [revisions, summary] = await Promise.all([
      getRevisions(client, user.id),
      workspaceSummary(client, user),
    ]);
    const initialData: DashboardData = {
      mode: "live",
      jobs: [],
      monitors: [],
      sources: [],
      runs: [],
      authenticated: true,
      user,
      summary: summary.counts,
    };
    return (
      <Dashboard
        initialView={view}
        initialData={JSON.parse(JSON.stringify(initialData))}
        initialRevisions={revisions}
        initialNextCursor={null}
        initialJobsTotal={0}
        deferredResources={deferredResources}
      />
    );
  } finally {
    client.release();
  }
}

import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { currentUser } from "@/lib/auth";
import { connectDatabase } from "@/lib/db";
import {
  listJobs,
  listMonitors,
  listSources,
  workspaceSummary,
} from "@/lib/focused-repository";
import { getRevisions } from "@/lib/revisions";
import type { DashboardData } from "@/lib/types";

type View =
  | "overview"
  | "jobs"
  | "saved"
  | "monitors"
  | "sources"
  | "activity"
  | "cv"
  | "intelligence"
  | "settings";

export default async function WorkspacePage({ view }: { view: View }) {
  const client = await connectDatabase();
  try {
    const user = await currentUser(client);
    if (!user)
      redirect(`/auth?next=/app/${view === "overview" ? "dashboard" : view}`);
    if (!user.onboardingCompleted) redirect("/onboarding");
    const needsJobs = ["overview", "jobs", "saved"].includes(view);
    const needsMonitors = ["overview", "jobs", "saved", "monitors"].includes(
      view,
    );
    const needsSources = ["overview", "jobs", "saved"].includes(view);
    const deferredResources: Array<"jobs" | "monitors" | "sources" | "runs"> =
      [];
    if (!needsJobs) deferredResources.push("jobs");
    if (!needsMonitors) deferredResources.push("monitors");
    if (!needsSources) deferredResources.push("sources");
    deferredResources.push("runs");

    const [jobs, monitors, sources, revisions, summary] = await Promise.all([
      needsJobs
        ? listJobs(client, user, {
            limit: 50,
            cursor: null,
            search: "",
            status: view === "saved" ? "shortlist" : "all",
            monitor: "all",
            source: "all",
            matched: view === "overview" || view === "jobs",
            location: "",
            mode: "all",
          })
        : Promise.resolve({ items: [], nextCursor: null, total: 0 }),
      needsMonitors ? listMonitors(client, user.id) : Promise.resolve([]),
      needsSources && user.role === "owner"
        ? listSources(client)
        : Promise.resolve([]),
      getRevisions(client, user.id),
      workspaceSummary(client, user),
    ]);
    const initialData: DashboardData = {
      mode: "live",
      jobs: jobs.items,
      monitors,
      sources,
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
        initialNextCursor={jobs.nextCursor}
        initialJobsTotal={jobs.total}
        deferredResources={deferredResources}
      />
    );
  } finally {
    client.release();
  }
}

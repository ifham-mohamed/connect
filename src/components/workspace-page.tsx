import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { currentUser } from "@/lib/auth";
import { connectDatabase } from "@/lib/db";
import {
  listJobs,
  listMonitors,
  listRuns,
  listSources,
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
    const [jobs, monitors, sources, runs, revisions] = await Promise.all([
      listJobs(client, user, {
        limit: 50,
        cursor: null,
        search: "",
        // The shortlist screen includes both saved and applied roles. Its client
        // tabs narrow this first page without requiring a second bootstrap read.
        status: "all",
        monitor: "all",
        source: "all",
        matched: view === "overview" || view === "jobs",
        location: "",
        mode: "all",
      }),
      listMonitors(client, user.id),
      user.role === "owner" ? listSources(client) : Promise.resolve([]),
      user.role === "owner" ? listRuns(client) : Promise.resolve([]),
      getRevisions(client, user.id),
    ]);
    const initialData: DashboardData = {
      mode: "live",
      jobs: jobs.items,
      monitors,
      sources,
      runs: runs.map((run) => ({ ...run, jobIds: [], newJobIds: [] })),
      authenticated: true,
      user,
    };
    return (
      <Dashboard
        initialView={view}
        initialData={JSON.parse(JSON.stringify(initialData))}
        initialRevisions={revisions}
        initialNextCursor={jobs.nextCursor}
      />
    );
  } finally {
    client.release();
  }
}

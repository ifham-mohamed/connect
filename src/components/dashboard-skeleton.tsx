export type DashboardSkeletonView =
  | "overview"
  | "jobs"
  | "saved"
  | "monitors"
  | "sources"
  | "activity"
  | "cv"
  | "intelligence"
  | "settings";

const pageConfig: Record<
  DashboardSkeletonView,
  {
    eyebrow: boolean;
    titleLines: number;
    subtitle: boolean;
    stats?: number;
    callout?: boolean;
    panel: "jobs" | "cards" | "sources" | "activity" | "settings";
    rows: number;
    cards?: number;
  }
> = {
  overview: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    stats: 4,
    callout: true,
    panel: "jobs",
    rows: 5,
  },
  jobs: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "jobs",
    rows: 7,
  },
  saved: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "jobs",
    rows: 4,
  },
  monitors: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "cards",
    rows: 6,
    cards: 6,
  },
  sources: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    callout: true,
    panel: "sources",
    rows: 6,
    cards: 6,
  },
  activity: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "activity",
    rows: 6,
  },
  settings: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "settings",
    rows: 3,
    cards: 2,
  },
  cv: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    panel: "settings",
    rows: 3,
    cards: 2,
  },
  intelligence: {
    eyebrow: true,
    titleLines: 1,
    subtitle: true,
    callout: true,
    panel: "settings",
    rows: 3,
    cards: 2,
  },
};

export function DashboardSkeleton({
  view = "overview",
}: {
  view?: DashboardSkeletonView;
}) {
  const config = pageConfig[view];
  const sideItems = view === "settings" || view === "cv" ? 8 : 7;

  return (
    <main
      className={`skeleton-screen skeleton-${view}`}
      aria-label="Loading workspace"
    >
      <aside className="skeleton-sidebar" aria-hidden="true">
        <div className="skeleton-logo" />
        <div className="skeleton-nav-group">
          {Array.from({ length: sideItems }).map((_, index) => (
            <div className="skeleton-line" key={index} />
          ))}
        </div>
        <div className="skeleton-sidebar-spacer" />
        <div className="skeleton-line skeleton-bottom-line" />
        <div className="skeleton-line skeleton-bottom-line" />
      </aside>
      <section className="skeleton-main">
        <div className="skeleton-topbar">
          <span />
          <span />
          <span />
        </div>

        <div className="skeleton-hero">
          {config.eyebrow && <div className="skeleton-eyebrow" />}
          {Array.from({ length: config.titleLines }).map((_, index) => (
            <div className="skeleton-title" key={index} />
          ))}
          {config.subtitle && <div className="skeleton-subtitle" />}
        </div>

        {config.stats ? (
          <div className="skeleton-stats">
            {Array.from({ length: config.stats }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : null}

        {config.callout ? <div className="skeleton-callout" /> : null}

        {["sources", "activity", "cv", "intelligence"].includes(view) ? (
          <WorkspaceContentSkeleton
            kind={view as "sources" | "activity" | "cv" | "intelligence"}
          />
        ) : config.panel === "cards" || config.panel === "sources" ? (
          <div
            className={`skeleton-card-grid skeleton-card-grid-${config.panel}`}
          >
            {Array.from({ length: config.cards ?? 6 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : config.panel === "settings" ? (
          <div className="skeleton-settings-grid">
            {Array.from({ length: config.cards ?? 2 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : config.panel === "activity" ? (
          <div className="skeleton-table skeleton-activity-table">
            <div className="skeleton-table-head" />
            {Array.from({ length: config.rows }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : (
          <div className="skeleton-table skeleton-jobs-table">
            <div className="skeleton-tabs" />
            <div className="skeleton-search-row" />
            {Array.from({ length: config.rows }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
import { WorkspaceContentSkeleton } from "@/components/workspace-content-skeleton";

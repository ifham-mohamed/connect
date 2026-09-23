type ResourceKind =
  | "overview"
  | "jobs"
  | "saved"
  | "monitors"
  | "sources"
  | "activity"
  | "cv"
  | "intelligence"
  | "settings";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <span className={`workspace-shimmer ${className}`} aria-hidden="true" />
  );
}

export function WorkspaceContentSkeleton({ kind }: { kind: ResourceKind }) {
  if (kind === "overview") {
    return (
      <section
        className="workspace-resource-skeleton overview-content-skeleton"
        aria-label="Loading your workspace overview"
        aria-busy="true"
      >
        <div className="overview-skeleton-stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <Shimmer key={index} />
          ))}
        </div>
        <Shimmer className="overview-skeleton-ribbon" />
        <div className="overview-skeleton-layout">
          <div className="resource-skeleton-panel">
            <Shimmer className="heading" />
            <div className="resource-skeleton-tabs">
              {Array.from({ length: 4 }).map((_, index) => (
                <Shimmer key={index} />
              ))}
            </div>
            <div className="resource-skeleton-toolbar">
              <Shimmer />
              <Shimmer />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <Shimmer className="resource-skeleton-row" key={index} />
            ))}
          </div>
          <div className="overview-skeleton-rail">
            <Shimmer />
            <Shimmer />
            <Shimmer />
          </div>
        </div>
      </section>
    );
  }

  if (kind === "settings") {
    return (
      <section
        className="workspace-resource-skeleton settings-content-skeleton"
        aria-label="Loading workspace settings"
        aria-busy="true"
      >
        <Shimmer className="settings-skeleton-overview" />
        <div className="settings-skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <Shimmer key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (kind === "cv") {
    return (
      <section
        className="workspace-resource-skeleton cv-content-skeleton"
        aria-label="Loading your saved CV"
        aria-busy="true"
      >
        <div className="resource-skeleton-heading">
          <Shimmer className="resource-skeleton-icon" />
          <div>
            <Shimmer className="short" />
            <Shimmer className="heading" />
            <Shimmer className="copy" />
          </div>
        </div>
        <Shimmer className="cv-skeleton-dropzone" />
        <div className="cv-skeleton-summary">
          <Shimmer />
          <Shimmer />
          <Shimmer />
        </div>
        <div className="cv-skeleton-sections">
          <Shimmer />
          <Shimmer />
        </div>
      </section>
    );
  }

  if (kind === "intelligence") {
    return (
      <section
        className="workspace-resource-skeleton intelligence-content-skeleton"
        aria-label="Loading career intelligence"
        aria-busy="true"
      >
        <div className="resource-skeleton-heading intelligence-skeleton-heading">
          <Shimmer className="resource-skeleton-icon" />
          <div>
            <Shimmer className="short" />
            <Shimmer className="heading" />
            <Shimmer className="copy" />
          </div>
        </div>
        <div className="intelligence-skeleton-stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <Shimmer key={index} />
          ))}
        </div>
        <div className="intelligence-skeleton-lists">
          {[0, 1].map((column) => (
            <div className="resource-skeleton-panel" key={column}>
              <Shimmer className="short" />
              <Shimmer className="heading" />
              {Array.from({ length: 3 }).map((_, index) => (
                <Shimmer className="resource-skeleton-row" key={index} />
              ))}
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`workspace-resource-skeleton ${kind}-content-skeleton`}
      aria-label={
        kind === "sources"
          ? "Loading connected sources"
          : kind === "activity"
            ? "Loading collection activity"
            : kind === "monitors"
              ? "Loading personal monitors"
              : kind === "saved"
                ? "Loading saved opportunities"
                : "Loading opportunities"
      }
      aria-busy="true"
    >
      {kind === "sources" ? (
        <div className="source-skeleton-overview">
          {Array.from({ length: 3 }).map((_, index) => (
            <Shimmer key={index} />
          ))}
        </div>
      ) : null}
      <div className="resource-skeleton-panel">
        <div className="resource-skeleton-tabs">
          {Array.from({ length: 4 }).map((_, index) => (
            <Shimmer key={index} />
          ))}
        </div>
        <div className="resource-skeleton-toolbar">
          <Shimmer />
          <Shimmer />
        </div>
        <Shimmer className="resource-skeleton-result" />
        <div className="resource-skeleton-table">
          <Shimmer className="resource-skeleton-table-head" />
          {Array.from({
            length:
              kind === "jobs" || kind === "saved"
                ? 7
                : kind === "sources" || kind === "monitors"
                  ? 6
                  : 5,
          }).map((_, index) => (
            <Shimmer className="resource-skeleton-row" key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SettingsCardSkeleton() {
  return (
    <section
      className="settings-card settings-card-skeleton"
      aria-label="Loading settings"
      aria-busy="true"
    >
      <div className="resource-skeleton-heading">
        <Shimmer className="resource-skeleton-icon" />
        <div>
          <Shimmer className="heading" />
          <Shimmer className="copy" />
        </div>
      </div>
      <Shimmer className="resource-skeleton-row" />
      <Shimmer className="resource-skeleton-row" />
    </section>
  );
}

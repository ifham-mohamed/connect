type ResourceKind = "sources" | "activity" | "cv" | "intelligence";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <span className={`workspace-shimmer ${className}`} aria-hidden="true" />
  );
}

export function WorkspaceContentSkeleton({ kind }: { kind: ResourceKind }) {
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
          : "Loading collection activity"
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
          {Array.from({ length: kind === "sources" ? 6 : 5 }).map(
            (_, index) => (
              <Shimmer className="resource-skeleton-row" key={index} />
            ),
          )}
        </div>
      </div>
    </section>
  );
}

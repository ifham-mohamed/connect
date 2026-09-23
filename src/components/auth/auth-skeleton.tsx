export function AuthSkeleton() {
  return (
    <main
      className="auth-shell auth-loading-shell"
      aria-label="Loading account access"
      aria-busy="true"
    >
      <section className="auth-skeleton-story" aria-hidden="true">
        <span className="auth-skeleton-brand workspace-shimmer" />
        <div className="auth-skeleton-story-copy">
          <span className="workspace-shimmer auth-skeleton-kicker" />
          <span className="workspace-shimmer auth-skeleton-display" />
          <span className="workspace-shimmer auth-skeleton-display short" />
          <span className="workspace-shimmer auth-skeleton-copy" />
          <span className="workspace-shimmer auth-skeleton-copy short" />
          <div className="auth-skeleton-chips">
            <span className="workspace-shimmer" />
            <span className="workspace-shimmer" />
            <span className="workspace-shimmer" />
          </div>
        </div>
      </section>
      <section className="auth-skeleton-form" aria-hidden="true">
        <span className="workspace-shimmer auth-skeleton-back" />
        <div className="auth-skeleton-form-card">
          <span className="workspace-shimmer auth-skeleton-icon" />
          <span className="workspace-shimmer auth-skeleton-heading" />
          <span className="workspace-shimmer auth-skeleton-copy" />
          <span className="workspace-shimmer auth-skeleton-tabs" />
          <span className="workspace-shimmer auth-skeleton-input" />
          <span className="workspace-shimmer auth-skeleton-input" />
          <span className="workspace-shimmer auth-skeleton-submit" />
        </div>
      </section>
    </main>
  );
}

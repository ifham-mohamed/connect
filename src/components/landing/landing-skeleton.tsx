export function LandingSkeleton() {
  return (
    <main className="landing-loading" aria-label="Loading Jobradar home">
      <header className="landing-loading-nav" aria-hidden="true">
        <span className="landing-loading-brand" />
        <span className="landing-loading-links">
          <i />
          <i />
          <i />
        </span>
      </header>

      <section className="landing-loading-hero" aria-hidden="true">
        <div className="landing-loading-copy">
          <span className="landing-loading-kicker" />
          <span className="landing-loading-title short" />
          <span className="landing-loading-title" />
          <span className="landing-loading-title accent" />
          <span className="landing-loading-text" />
          <span className="landing-loading-text narrow" />
          <div className="landing-loading-actions"><i /><i /></div>
          <div className="landing-loading-proof"><i /><i /><i /></div>
        </div>

        <div className="landing-loading-preview">
          <div className="landing-loading-preview-head"><i /><i /></div>
          <div className="landing-loading-preview-stats"><i /><i /><i /></div>
          <div className="landing-loading-preview-search" />
          <div className="landing-loading-preview-rows"><i /><i /><i /></div>
        </div>
      </section>
    </main>
  );
}

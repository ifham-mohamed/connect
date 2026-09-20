export default function Loading() {
  return (
    <main className="skeleton-screen">
      <aside>
        <div className="skeleton-logo" />
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="skeleton-line" key={index} />
        ))}
      </aside>
      <section>
        <div className="skeleton-topbar" />
        <div className="skeleton-heading" />
        <div className="skeleton-stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="skeleton-table">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}

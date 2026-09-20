"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-screen">
      <h1>Something went wrong.</h1>
      <p>Your stored jobs are safe. Try loading the workspace again.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

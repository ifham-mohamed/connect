"use client";

import { useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Radio,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

export function AuthGate({
  onAuthenticated,
}: {
  onAuthenticated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand auth-brand">
          <span className="brand-icon">
            <Radio size={24} />
          </span>
          jobradar<span className="brand-dot">.</span>
        </div>
        <div>
          <span className="eyebrow">
            <span /> Your career, in focus
          </span>
          <h1>One calm place for your next opportunity.</h1>
          <p>
            Track matching roles, focused monitors, trusted sources, and your
            application shortlist in a private workspace.
          </p>
        </div>
        <div className="auth-trust">
          <ShieldCheck size={18} />
          <span>
            <strong>Your workspace stays private.</strong>
            <small>
              Every dashboard request requires an active account session.
            </small>
          </span>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              className={mode === "sign-in" ? "active" : ""}
              onClick={() => {
                setMode("sign-in");
                setError("");
              }}
              role="tab"
              aria-selected={mode === "sign-in"}
            >
              Sign in
            </button>
            <button
              className={mode === "sign-up" ? "active" : ""}
              onClick={() => {
                setMode("sign-up");
                setError("");
              }}
              role="tab"
              aria-selected={mode === "sign-up"}
            >
              Create account
            </button>
          </div>
          <div className="auth-heading">
            <span className="auth-icon">
              {mode === "sign-in" ? (
                <ShieldCheck size={22} />
              ) : (
                <UserPlus size={22} />
              )}
            </span>
            <h2 id="auth-title">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p>
              {mode === "sign-in"
                ? "Sign in to continue to your Jobradar workspace."
                : "The first account becomes the workspace owner. Later accounts join as members."}
            </p>
          </div>
          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                const response = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    mode,
                    email,
                    password,
                    ...(mode === "sign-up" ? { name } : {}),
                  }),
                });
                const result = await response.json();
                if (!response.ok)
                  throw new Error(result.error || "Account access failed.");
                await onAuthenticated();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Account access failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "sign-up" && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "sign-up" ? 12 : 1}
                maxLength={128}
                required
              />
            </label>
            {mode === "sign-up" && (
              <small>
                Use at least 12 characters with a letter and a number.
              </small>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary auth-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : mode === "sign-in" ? (
                <ShieldCheck size={17} />
              ) : (
                <UserPlus size={17} />
              )}
              {mode === "sign-in" ? "Sign in" : "Create account"}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

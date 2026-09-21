"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Moon,
  Radio,
  ShieldCheck,
  Sun,
  UserPlus,
  UserRound,
} from "lucide-react";
import { AuthVisual } from "./auth-visual";

export function AuthGate({
  onAuthenticated,
  initialMode = "sign-in",
}: {
  onAuthenticated: (needsOnboarding: boolean) => Promise<void>;
  initialMode?: "sign-in" | "sign-up";
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function selectMode(next: "sign-in" | "sign-up") {
    setMode(next);
    setError("");
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme !== "dark";
    const theme = next ? "dark" : "light";
    try {
      localStorage.setItem("jobradar-theme", theme);
    } catch {
      /* The selected theme still applies for this session. */
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("jobradar-dark", next);
    document.documentElement.classList.toggle("jobradar-light", !next);
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand auth-brand">
          <span className="brand-icon">
            <Radio size={24} />
          </span>
          jobradar<span className="brand-dot">.</span>
        </div>

        <div className="auth-story-copy">
          <span className="auth-badge">
            <ShieldCheck size={14} /> Private workspace
          </span>
          <h1>Your next opportunity, brought into focus.</h1>
          <p>
            Turn scattered job boards into one thoughtful search. Follow the
            roles that matter, preserve every source, and keep your shortlist
            moving.
          </p>
          <div className="auth-capabilities" aria-label="Workspace features">
            <span>Focused monitors</span>
            <span>Trusted sources</span>
            <span>Application shortlist</span>
          </div>
        </div>

        <AuthVisual />
        <p className="auth-story-note">
          Built for a calmer, more deliberate job search.
        </p>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <Link className="auth-back" href="/" aria-label="Back to Jobradar home">
          <ArrowLeft size={16} />
          <span>Back home</span>
        </Link>
        <button
          className="icon-btn auth-theme"
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
        >
          <Sun className="theme-sun" size={18} />
          <Moon className="theme-moon" size={18} />
        </button>

        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-icon">
              <Radio size={20} />
            </span>
            <strong>jobradar<span>.</span></strong>
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
                ? "Sign in to continue to your private Jobradar workspace."
                : "Set up secure access to the shared Jobradar workspace."}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              className={mode === "sign-in" ? "active" : ""}
              onClick={() => selectMode("sign-in")}
              role="tab"
              aria-selected={mode === "sign-in"}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "sign-up" ? "active" : ""}
              onClick={() => selectMode("sign-up")}
              role="tab"
              aria-selected={mode === "sign-up"}
            >
              Create account
            </button>
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
                await onAuthenticated(
                  mode === "sign-up" || result.user?.onboardingCompleted === false,
                );
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
                <span className="auth-input">
                  <UserRound size={17} />
                  <input
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </span>
              </label>
            )}
            <label>
              Email address
              <span className="auth-input">
                <AtSign size={17} />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                />
              </span>
            </label>
            <label>
              Password
              <span className="auth-input">
                <LockKeyhole size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  placeholder={mode === "sign-up" ? "12+ characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={mode === "sign-up" ? 12 : 1}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {mode === "sign-up" && (
              <div className="auth-account-note">
                <ShieldCheck size={15} />
                <span>
                  Use at least 12 characters with a letter and a number. The
                  first account becomes the workspace owner.
                </span>
              </div>
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
              {mode === "sign-in" ? "Sign in to workspace" : "Create account"}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-footnote">
            Protected with encrypted transport, hashed passwords, and expiring
            sessions.
          </p>
        </div>
      </section>
    </main>
  );
}

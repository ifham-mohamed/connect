import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Check,
  LayoutDashboard,
  Link2,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";

const workflow = [
  {
    icon: Link2,
    step: "01",
    title: "Bring trusted sources together",
    text: "Review Sri Lankan, remote, and employer-board openings with their original links preserved.",
  },
  {
    icon: Radio,
    step: "02",
    title: "Focus the search",
    text: "Use role, location, seniority, and exclusion monitors to surface opportunities that fit.",
  },
  {
    icon: Bookmark,
    step: "03",
    title: "Move with intention",
    text: "Save promising roles, record applications, and return to the next useful action.",
  },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LandingPage({ user }: { user: AuthUser | null }) {
  const workspaceLabel = user?.role === "owner" ? "Workspace owner" : "Workspace member";

  return (
    <main className="landing-shell">
      <header className="landing-nav">
        <Link className="brand landing-brand" href="/" aria-label="Jobradar home">
          <span className="brand-icon"><Radio size={23} /></span>
          jobradar<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#workflow">How it works</a>
          <a href="#privacy">Private workspace</a>
          {user ? (
            <>
              <div className="landing-account" title={user.email}>
                <span className="landing-account-avatar">{initials(user.name)}</span>
                <span>
                  <strong>{user.name}</strong>
                  <small>{workspaceLabel}</small>
                </span>
              </div>
              <Link className="btn primary" href="/app/dashboard">
                Open workspace <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <Link className="landing-signin" href="/auth">Sign in</Link>
              <Link className="btn primary" href="/auth?mode=sign-up">
                Create account <ArrowRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-kicker"><Sparkles size={14} /> A more thoughtful job search</span>
          <h1>Less searching.<br /><span>More possibility.</span></h1>
          <p>
            Jobradar collects relevant technology roles, matches them to your
            priorities, and keeps your shortlist clear—from discovery to application.
          </p>
          <div className="landing-actions">
            <Link className="btn primary" href={user ? "/app/dashboard" : "/auth?mode=sign-up"}>
              {user ? "Continue to dashboard" : "Start your workspace"} <ArrowRight size={16} />
            </Link>
            <Link className="btn" href={user ? "/app/saved" : "/auth"}>
              {user ? <><Bookmark size={15} /> View saved jobs</> : "Sign in"}
            </Link>
          </div>
          <div className="landing-proof">
            <span><Check size={14} /> Source attribution</span>
            <span><Check size={14} /> Role monitors</span>
            <span><Check size={14} /> Private account access</span>
          </div>
        </div>

        <div className="landing-preview" aria-label="Jobradar workspace preview">
          <div className="landing-preview-top">
            <span><i /> Live workspace</span>
            <span>Sri Lanka &amp; remote</span>
          </div>
          <div className="landing-preview-stats">
            <article><BriefcaseBusiness size={18} /><span>Relevant roles<strong>84</strong></span></article>
            <article><Radio size={18} /><span>Active monitors<strong>6</strong></span></article>
            <article><Bookmark size={18} /><span>Saved for later<strong>7</strong></span></article>
          </div>
          <div className="landing-preview-list">
            <div className="landing-search"><Search size={16} /> Search roles, companies, or skills</div>
            {[
              ["Full Stack Developer", "Colombo · Remote", "Monitor match"],
              ["Associate Software Engineer", "Sri Lanka", "New"],
              ["Frontend React Developer", "Remote", "Saved"],
            ].map(([title, location, state]) => (
              <article key={title}>
                <span className="landing-job-mark">{title[0]}</span>
                <span><strong>{title}</strong><small>{location}</small></span>
                <em>{state}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-section-heading">
          <span>Built around the work</span>
          <h2>A clear path from discovery to follow-up.</h2>
          <p>One workspace keeps the signal, context, and next action together.</p>
        </div>
        <div className="landing-workflow-grid">
          {workflow.map((item) => (
            <article key={item.step}>
              <span className="landing-step">{item.step}</span>
              <item.icon size={22} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-private" id="privacy">
        <span className="landing-private-icon"><ShieldCheck size={25} /></span>
        <div>
          <span>Private by default</span>
          <h2>Your search belongs in your workspace.</h2>
          <p>Dashboard data requires an authenticated account. Passwords are hashed and sessions expire automatically.</p>
        </div>
        <Link className="btn primary" href={user ? "/app/dashboard" : "/auth"}>
          {user ? <><LayoutDashboard size={15} /> Open your workspace</> : <>Continue securely <ArrowRight size={15} /></>}
        </Link>
      </section>

      <footer className="landing-footer">
        <span>jobradar · Less searching. More possibility.</span>
        <Link href={user ? "/app/settings" : "/auth"}>
          {user ? "Account settings" : "Workspace access"} <ArrowRight size={13} />
        </Link>
      </footer>
    </main>
  );
}

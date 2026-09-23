"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Laptop, LoaderCircle, ShieldCheck } from "lucide-react";

type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  deviceId: string;
  networkId: string;
  current: boolean;
};
type Event = {
  id: string;
  eventType: string;
  severity: "info" | "warning" | "critical";
  route: string;
  deviceId: string;
  networkId: string;
  createdAt: string;
  accountName?: string;
  accountEmail?: string;
};

export default function SecurityActivity() {
  const [data, setData] = useState<{
    sessions: Session[];
    events: Event[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/security", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Security activity could not be loaded.");
    setData(result);
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => void load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [load]);
  async function revoke(session: Session) {
    setBusy(session.id);
    setError("");
    try {
      const response = await fetch("/api/security", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Session could not be revoked.");
      if (result.current) window.location.replace("/auth");
      else await load();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="settings-card security-activity-card">
      <div className="settings-card-heading compact">
        <span className="settings-icon">
          <ShieldCheck size={20} />
        </span>
        <span>
          <small>Account security</small>
          <h3>Sessions and security activity</h3>
        </span>
      </div>
      <p>
        Device and network identifiers are one-way hashes. Raw IP addresses and
        invasive browser fingerprints are not stored.
      </p>
      {!data && !error && (
        <span className="security-loading">
          <LoaderCircle className="spin" size={15} /> Loading protected
          activity…
        </span>
      )}
      {data && (
        <>
          <div className="security-section">
            <h4>Active sessions</h4>
            <div className="security-session-list">
              {data.sessions.map((session) => (
                <article key={session.id}>
                  <Laptop size={16} />
                  <span>
                    <strong>
                      {session.current
                        ? "This browser"
                        : `Device ${session.deviceId || "unknown"}`}
                    </strong>
                    <small>
                      Last active{" "}
                      {new Date(session.lastSeenAt).toLocaleString()} · network{" "}
                      {session.networkId || "unavailable"}
                    </small>
                  </span>
                  <button
                    className="btn small"
                    disabled={busy === session.id}
                    onClick={() => void revoke(session)}
                  >
                    {session.current ? "Sign out" : "Revoke"}
                  </button>
                </article>
              ))}
            </div>
          </div>
          <div className="security-section">
            <h4>Recent security events</h4>
            <div className="security-event-list">
              {data.events.length ? (
                data.events.slice(0, 12).map((event) => (
                  <article
                    className={`security-event ${event.severity}`}
                    key={event.id}
                  >
                    <AlertTriangle size={15} />
                    <span>
                      <strong>{event.eventType.replaceAll(".", " ")}</strong>
                      <small>
                        {event.accountName ? `${event.accountName} · ` : ""}
                        {new Date(event.createdAt).toLocaleString()} ·{" "}
                        {event.route || "account"}
                      </small>
                    </span>
                    <em>{event.severity}</em>
                  </article>
                ))
              ) : (
                <p>No suspicious account activity has been recorded.</p>
              )}
            </div>
          </div>
        </>
      )}
      {error && (
        <p className="job-review-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

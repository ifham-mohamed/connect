"use client";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export function Stat({
  label,
  value,
  icon,
  detail,
  trend,
  action,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
  trend?: string;
  action?: () => void;
}) {
  return (
    <section className="stat-card">
      <div className="stat-heading">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">
        {value.toLocaleString()}
        <span>
          {trend ? (
            <>
              <ArrowUpRight size={12} />
              {trend}
            </>
          ) : (
            <button onClick={action}>
              View shortlist <ArrowRight size={12} />
            </button>
          )}
        </span>
      </div>
      <p>{detail}</p>
    </section>
  );
}

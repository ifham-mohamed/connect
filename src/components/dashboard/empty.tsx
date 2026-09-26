"use client";

export function Empty({
  icon,
  title,
  description,
  action,
  label,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  label: string;
}) {
  return (
    <div className="empty">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn" onClick={action}>
        {label}
      </button>
    </div>
  );
}

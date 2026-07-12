import "./Badge.css";

export type BadgeStatus = "available" | "unavailable" | "loading" | "beta" | "new";

export interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  pulse?: boolean;
}

const DEFAULTS: Record<BadgeStatus, string> = {
  available: "Available",
  unavailable: "Unavailable",
  loading: "Checking…",
  beta: "Beta",
  new: "New",
};

export function Badge({ status, label, pulse = false }: BadgeProps) {
  return (
    <span className={`eq-badge eq-badge--${status} ${pulse ? "eq-badge--pulse" : ""}`}>
      <span className="eq-badge__dot" />
      <span className="eq-badge__label">{label ?? DEFAULTS[status]}</span>
    </span>
  );
}

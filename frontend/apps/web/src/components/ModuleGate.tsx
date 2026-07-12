import React from "react";
import { useModules } from "@/lib/modules";

interface Props {
  /** Module name to gate on — must match entry in modules.lock.yaml */
  name: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem" }}>
      {[60, 40, 80].map((w) => (
        <div
          key={w}
          style={{
            height: "1rem",
            width: `${w}%`,
            borderRadius: "0.5rem",
            background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "eq-shimmer 1.4s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function UnavailableCard({ name }: { name: string }) {
  return (
    <div className="eq-gate__unavailable">
      <div className="eq-gate__unavailable-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </div>
      <h3 className="eq-gate__unavailable-title">Module Not Available</h3>
      <p className="eq-gate__unavailable-body">
        <strong>{name}</strong> is not installed on this platform instance.
        Contact your administrator to enable it.
      </p>
    </div>
  );
}

/**
 * Shell-level ModuleGate that uses the shared useModules hook.
 *
 * Usage:
 *   <ModuleGate name="hydrology-module">
 *     <HydrologyDashboard />
 *   </ModuleGate>
 */
export function ModuleGate({ name, fallback, children }: Props) {
  const { isLoading, isAvailable } = useModules();
  if (isLoading) return <Skeleton />;
  if (!isAvailable(name)) return <>{fallback ?? <UnavailableCard name={name} />}</>;
  return <>{children}</>;
}

import React, { createContext, useContext, useEffect, useState } from "react";
import "./ModuleGate.css";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ModuleInfo {
  name: string;
  version: string;
  enabled: boolean;
  description?: string;
  capabilities?: {
    has_backend?: boolean;
    has_frontend?: boolean;
    has_infra?: boolean;
    extras?: string[];
  };
}

interface ModulesContextValue {
  modules: ModuleInfo[];
  isLoading: boolean;
  error: string | null;
  isAvailable: (name: string) => boolean;
}

// ── Context ────────────────────────────────────────────────────────────────────

const ModulesContext = createContext<ModulesContextValue>({
  modules: [],
  isLoading: true,
  error: null,
  isAvailable: () => false,
});

export interface ModulesProviderProps {
  apiBase?: string;
  children: React.ReactNode;
}

export function ModulesProvider({
  apiBase = "",
  children,
}: ModulesProviderProps) {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase}/api/modules`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ModuleInfo[]>;
      })
      .then((data) => {
        setModules(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setIsLoading(false);
      });
  }, [apiBase]);

  const isAvailable = (name: string) =>
    modules.some((m) => m.name === name && m.enabled);

  return (
    <ModulesContext.Provider value={{ modules, isLoading, error, isAvailable }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModulesContext() {
  return useContext(ModulesContext);
}

// ── ModuleGate ─────────────────────────────────────────────────────────────────

export interface ModuleGateProps {
  /** The module name to gate on (must match modules.lock.yaml). */
  name: string;
  /** Custom fallback. Defaults to the built-in unavailable card. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function Skeleton() {
  return (
    <div className="eq-gate__skeleton">
      <div className="eq-gate__skeleton-bar" style={{ width: "60%" }} />
      <div className="eq-gate__skeleton-bar" style={{ width: "40%" }} />
      <div className="eq-gate__skeleton-bar" style={{ width: "80%" }} />
    </div>
  );
}

function UnavailableCard({ name }: { name: string }) {
  return (
    <div className="eq-gate__unavailable">
      <div className="eq-gate__unavailable-icon" aria-hidden="true">
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

export function ModuleGate({ name, fallback, children }: ModuleGateProps) {
  const { isLoading, isAvailable } = useModulesContext();

  if (isLoading) return <Skeleton />;
  if (!isAvailable(name)) return <>{fallback ?? <UnavailableCard name={name} />}</>;
  return <>{children}</>;
}

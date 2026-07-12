/**
 * EarthIQ Core — App Shell
 *
 * Module routes are 100% dynamic:
 *  1. /api/modules tells us which modules are enabled at runtime.
 *  2. moduleRegistry (auto-generated) maps names → lazy bundle loaders.
 *  3. We mount a lazy <Route> only for modules that are BOTH in the
 *     registry AND enabled server-side. App.tsx itself never references
 *     a module name or import path.
 */
import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/lib/auth";
import { useModules } from "@/lib/modules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";

import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MapPage from "@/pages/MapPage";

// AUTO-GENERATED — never import module names directly here
import { moduleRegistry, type ModuleBundle } from "./module-registry.generated";

// ── Helpers ────────────────────────────────────────────────────────────────────

function PageFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        color: "var(--eq-text-muted)",
        fontSize: "0.875rem",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          width: "1em",
          height: "1em",
          border: "2px solid rgba(255,255,255,0.1)",
          borderTopColor: "var(--eq-accent)",
          borderRadius: "50%",
          animation: "eq-spin 0.6s linear infinite",
          display: "inline-block",
        }}
      />
      Loading module…
    </div>
  );
}

// ── Dynamic module routes ──────────────────────────────────────────────────────

interface ActiveModule {
  name: string;
  routePath: string;
  Page: React.ComponentType;
}

// Module-level cache — survives re-renders but is cleared on page refresh.
// Keyed separately from the "is loading" state so core routes are never blocked.
let _resolvedModulesCache: ActiveModule[] | null = null;

/**
 * Resolves enabled module bundles to obtain their self-declared routePaths.
 * Returns `resolving: true` only during the async bundle import phase —
 * NOT while /api/modules is loading — so core routes always render immediately.
 */
function useActiveModules() {
  const { modules, isLoading: modulesLoading } = useModules();
  const [activeModules, setActiveModules] = useState<ActiveModule[]>(_resolvedModulesCache ?? []);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    // Wait for the /api/modules response before doing anything.
    if (modulesLoading) return;

    // Serve from cache on subsequent renders.
    if (_resolvedModulesCache !== null) {
      setActiveModules(_resolvedModulesCache);
      return;
    }

    const enabled = modules.filter((m) => m.enabled && m.name in moduleRegistry);
    if (!enabled.length) {
      // No modules registered — cache the empty result and stop.
      _resolvedModulesCache = [];
      setActiveModules([]);
      return;
    }

    // Async: import each module bundle to read its self-declared routePath.
    setResolving(true);
    Promise.all(
      enabled.map((m) =>
        moduleRegistry[m.name]().then((bundle: ModuleBundle) => ({
          name: m.name,
          routePath: bundle.routePath.startsWith("/")
            ? bundle.routePath.slice(1)
            : bundle.routePath,
          Page: bundle.Page,
        }))
      )
    ).then((resolved) => {
      _resolvedModulesCache = resolved;
      setActiveModules(resolved);
      setResolving(false);
    });
  }, [modules, modulesLoading]);

  return { activeModules, resolving };
}

/**
 * Rendered inside the protected shell. Core routes (dashboard, map) are
 * available immediately. Module routes appear once their bundles are resolved.
 */
function ProtectedRoutes() {
  const { activeModules, resolving } = useActiveModules();

  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="map" element={<MapPage />} />

      {/* Module routes — available once bundles finish resolving */}
      {!resolving &&
        activeModules.map((m) => (
          <Route key={m.name} path={`${m.routePath}/*`} element={<m.Page />} />
        ))}

      {/* 404 — only shown after module resolution is complete */}
      {!resolving && (
        <Route
          path="*"
          element={
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <h2 style={{ color: "var(--eq-text-primary)" }}>404 — Not Found</h2>
              <p style={{ color: "var(--eq-text-secondary)", marginTop: "0.5rem" }}>
                This page doesn't exist.
              </p>
            </div>
          }
        />
      )}
    </Routes>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected shell */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Suspense fallback={<PageFallback />}>
                    <ProtectedRoutes />
                  </Suspense>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

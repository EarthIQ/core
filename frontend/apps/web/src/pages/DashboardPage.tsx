import { useModules, ModuleInfo } from "@/lib/modules";
import { Badge } from "@repo/ui";

// ── Module capability chips ────────────────────────────────────────────────────

function CapChips({ caps }: { caps: ModuleInfo["capabilities"] }) {
  const chips: string[] = [];
  if (caps.has_backend) chips.push("backend");
  if (caps.has_frontend) chips.push("frontend");
  if (caps.has_infra) chips.push("infra");
  caps.extras?.forEach((e) => chips.push(e));
  return (
    <div className="eq-module-card__caps">
      {chips.map((c) => (
        <span key={c} className="eq-cap-chip">{c}</span>
      ))}
    </div>
  );
}

// ── Module icon (generic geospatial globe) ─────────────────────────────────────

function ModuleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 1 0 20A14.5 14.5 0 0 1 12 2" />
      <path d="M2 12h20" />
    </svg>
  );
}

// ── Module card ────────────────────────────────────────────────────────────────

function ModuleCard({ mod }: { mod: ModuleInfo }) {
  return (
    <div className="eq-module-card" id={`module-card-${mod.name}`}>
      <div className="eq-module-card__header">
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <div className="eq-module-card__icon">
            <ModuleIcon />
          </div>
          <div>
            <div className="eq-module-card__name">{mod.name}</div>
            <div className="eq-module-card__version">v{mod.version}</div>
          </div>
        </div>
        <Badge
          status={mod.enabled ? "available" : "unavailable"}
          pulse={mod.enabled}
        />
      </div>

      {mod.description && (
        <p className="eq-module-card__desc">{mod.description}</p>
      )}

      <CapChips caps={mod.capabilities} />
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ modules }: { modules: ModuleInfo[] }) {
  const enabled = modules.filter((m) => m.enabled).length;
  return (
    <div
      style={{
        display: "flex",
        gap: "2rem",
        padding: "1rem 1.5rem",
        background: "var(--eq-bg-surface)",
        border: "1px solid var(--eq-border)",
        borderRadius: "var(--eq-radius-lg)",
        marginBottom: "2rem",
      }}
    >
      {[
        { label: "Installed modules", value: modules.length },
        { label: "Active", value: enabled },
        { label: "Inactive", value: modules.length - enabled },
      ].map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              fontFamily: "var(--eq-font-display)",
              color: "var(--eq-text-primary)",
              lineHeight: 1,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--eq-text-muted)", marginTop: "0.25rem" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { modules, isLoading, error } = useModules();

  return (
    <div>
      <div className="eq-page-header">
        <div className="eq-page-header__eyebrow">Platform Overview</div>
        <h1 className="eq-gradient-text">Dashboard</h1>
        <p style={{ marginTop: "0.5rem", color: "var(--eq-text-secondary)" }}>
          Geospatial intelligence at your fingertips. Manage and monitor your installed modules.
        </p>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[70, 50, 90].map((w) => (
            <div
              key={w}
              style={{
                height: "1.25rem",
                width: `${w}%`,
                borderRadius: "0.5rem",
                background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.04) 75%)",
                backgroundSize: "200% 100%",
                animation: "eq-shimmer 1.4s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="eq-form__error">
          Could not load module status: {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <StatsBar modules={modules} />
          {modules.length === 0 ? (
            <div
              style={{
                padding: "4rem 2rem",
                textAlign: "center",
                color: "var(--eq-text-muted)",
                border: "1.5px dashed var(--eq-border)",
                borderRadius: "var(--eq-radius-xl)",
              }}
            >
              <p>No modules are currently installed.</p>
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Add modules via <code>setup sync</code>.
              </p>
            </div>
          ) : (
            <div className="eq-dashboard__grid">
              {modules.map((m) => (
                <ModuleCard key={m.name} mod={m} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

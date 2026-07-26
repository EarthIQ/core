import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useModules } from "@/lib/modules";
import { moduleRegistry, type ModuleBundle } from "../module-registry.generated";

interface NavItem {
  label: string;
  to: string;
  icon?: string;
}

const CORE_NAV: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "📊",
  },
  {
    label: "Projects",
    to: "/projects",
    icon: "📁",
  },
  {
    label: "Data",
    to: "/data",
    icon: "🌐",
  },
];

/**
 * Loads navItem from each enabled module's bundle (lazy, cached).
 */
function useModuleNavItems(): NavItem[] {
  const { modules } = useModules();
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const enabled = modules.filter((m) => m.enabled && m.name in moduleRegistry);
    if (!enabled.length) return;

    Promise.all(
      enabled.map((m) =>
        moduleRegistry[m.name]().then((bundle: ModuleBundle) => ({
          ...bundle.navItem,
          icon: "🧩",
        }))
      )
    ).then(setNavItems);
  }, [modules]);

  return navItems;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);
  const moduleNav = useModuleNavItems();
  const allNav = [...CORE_NAV, ...moduleNav];

  // Map view detection: when path is /map, hide sidebar to maximize map workspace
  const isMapView = location.pathname.startsWith("/map");

  // Close user menu popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="eq-layout">
      {/* ── Collapsible Left Sidebar (Hidden on Map View) ── */}
      <aside
        className={`eq-sidebar${isCollapsed ? " eq-sidebar--collapsed" : ""}${
          isMapView ? " eq-sidebar--hidden" : ""
        }`}
      >
        {/* Header / Brand */}
        <div className="eq-sidebar__header">
          <NavLink to="/dashboard" className="eq-sidebar__brand">
            <span className="eq-sidebar__brand-dot" />
            {!isCollapsed && <span>EarthIQ</span>}
          </NavLink>

          <button
            className="eq-sidebar__toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isCollapsed ? (
                <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
              ) : (
                <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="eq-sidebar__nav">
          <div className="eq-sidebar__section-label">Main Navigation</div>
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `eq-sidebar__link${isActive ? " active" : ""}`
              }
            >
              <span className="eq-sidebar__link-icon">{item.icon || "📍"}</span>
              <span className="eq-sidebar__link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer — VS Code Style User Profile Icon & Popup Menu */}
        <div className="eq-sidebar__footer" ref={popoverRef}>
          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div className="eq-user-menu-popover">
              <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--eq-border)" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--eq-text-primary)" }}>
                  {user?.email || "Signed In User"}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--eq-text-muted)", marginTop: "0.15rem" }}>
                  EarthIQ Core Platform
                </div>
              </div>

              <div style={{ padding: "0.35rem 0" }}>
                <button
                  className="eq-popover-item"
                  onClick={toggleTheme}
                >
                  <span style={{ fontSize: "1rem" }}>{activeTheme === "dark" ? "☀️" : "🌙"}</span>
                  {activeTheme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
                </button>

                <button
                  className="eq-popover-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </button>

                <div className="eq-popover-divider" />

                <button
                  className="eq-popover-item eq-popover-item--danger"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out / Logout
                </button>
              </div>
            </div>
          )}

          {/* User Button */}
          <button
            id="user-menu-btn"
            className={`eq-sidebar__user-btn${isUserMenuOpen ? " active" : ""}`}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title="User Profile & Settings"
          >
            <div className="eq-user-avatar">{userInitial}</div>
            {!isCollapsed && (
              <div className="eq-sidebar__user-info">
                <span className="eq-sidebar__user-name">{user?.email || "Account"}</span>
                <span className="eq-sidebar__user-role">Administrator</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Container & Topbar ── */}
      <div
        className={`eq-main-container${
          isMapView
            ? " eq-main-container--full"
            : isCollapsed
            ? " eq-main-container--collapsed"
            : ""
        }`}
      >
        {/* Topbar with Center Search */}
        <header className="eq-topbar">
          <div className="eq-topbar__left">
            {isMapView ? (
              <button
                className="eq-btn-back"
                onClick={() => navigate("/projects")}
                title="Return to Projects catalog"
              >
                ← Back to Projects
              </button>
            ) : (
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--eq-text-secondary)" }}>
                EarthIQ GIS Core
              </div>
            )}
          </div>

          {/* Search at Center */}
          <div className="eq-topbar__center">
            <div className="eq-search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--eq-text-muted)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="eq-search-bar__input"
                placeholder="Search projects, layers, datasets, tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="eq-search-bar__shortcut">/</span>
            </div>
          </div>

          <div className="eq-topbar__right">
            <button
              onClick={toggleTheme}
              title={`Switch to ${activeTheme === "dark" ? "Light" : "Dark"} theme`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "var(--eq-radius-md)",
                background: "var(--eq-bg-elevated)",
                border: "1px solid var(--eq-border)",
                color: "var(--eq-text-primary)",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              <span>{activeTheme === "dark" ? "☀️ Light" : "🌙 Dark"}</span>
            </button>

            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.2rem 0.6rem",
                borderRadius: "999px",
                background: "rgba(34,211,160,0.12)",
                color: "var(--eq-accent)",
                border: "1px solid rgba(34,211,160,0.3)",
                fontWeight: 600,
              }}
            >
              System Online
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="eq-main-content">{children}</main>
      </div>

      {/* ── Settings Modal ── */}
      {isSettingsOpen && (
        <div className="eq-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="eq-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="eq-modal-header">
              <h2 style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>⚙️</span> EarthIQ Settings
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--eq-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <div className="eq-form">
              <div className="eq-field">
                <label className="eq-field__label">Map Display Units</label>
                <select className="eq-field__input" defaultValue="metric">
                  <option value="metric">Metric (Meters, Kilometers)</option>
                  <option value="imperial">Imperial (Feet, Miles)</option>
                </select>
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Default Vector Basemap</label>
                <select className="eq-field__input" defaultValue="dataviz-dark">
                  <option value="dataviz-dark">Dark Matter (CARTO)</option>
                  <option value="dataviz-light">Positron Light (CARTO)</option>
                  <option value="satellite">Voyager Satellite</option>
                </select>
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Default Coordinate System</label>
                <input
                  type="text"
                  className="eq-field__input"
                  defaultValue="EPSG:4326 - WGS 84"
                  readOnly
                />
              </div>

              <div className="eq-field">
                <label className="eq-field__label">Account Email</label>
                <input
                  type="text"
                  className="eq-field__input"
                  value={user?.email || ""}
                  readOnly
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "var(--eq-radius-md)",
                    background: "var(--eq-accent)",
                    color: "#080d14",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

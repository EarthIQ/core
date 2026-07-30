import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useModules } from "@/lib/modules";
import {
  moduleRegistry,
  type ModuleBundle,
} from "../module-registry.generated";
import { Button } from "@packages/ui";
import { Settings, Sun, Moon, Search } from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon?: string;
}

const CORE_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: "📊" },
  { label: "Projects", to: "/projects", icon: "📁" },
  { label: "Data", to: "/data", icon: "🌐" },
];

/**
 * Loads navItem from each enabled module's bundle (lazy, cached).
 */
function useModuleNavItems(): NavItem[] {
  const { modules } = useModules();
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const enabled = modules.filter(
      (m) => m.enabled && m.name in moduleRegistry,
    );
    if (!enabled.length) return;

    Promise.all(
      enabled.map((m) =>
        moduleRegistry[m.name]().then((bundle: ModuleBundle) => ({
          ...bundle.navItem,
          icon: "🧩",
        })),
      ),
    ).then(setNavItems);
  }, [modules]);

  return navItems;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      {collapsed ? (
        <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
      ) : (
        <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
      )}
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ── User Menu Popover ──────────────────────────────────────────────────────────

function UserMenuPopover({
  user,
  activeTheme,
  toggleTheme,
  onSettings,
  onLogout,
}: {
  user: { email?: string } | null;
  activeTheme: string;
  toggleTheme: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-elevated border border-border-primary rounded-lg shadow-dropdown animate-fade-in-up z-50 overflow-hidden">
      {/* User Info Header */}
      <div className="px-3 py-2.5 border-b border-border-primary">
        <div className="text-sm font-bold text-text-primary truncate">
          {user?.email || "Signed In User"}
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">
          EarthIQ Core Platform
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1.5">
        <button className="dropdown-item w-full" onClick={toggleTheme}>
          <span className="text-base">
            {activeTheme === "dark" ? "☀️" : "🌙"}
          </span>
          {activeTheme === "dark" ? "Light" : "Dark"}
        </button>

        <Button
          className="dropdown-item w-full"
          onClick={onSettings}
          leftIcon={<Settings size={16} />}
        >
          Settings
        </Button>

        <div className="dropdown-divider" />

        <Button
          className="dropdown-item dropdown-item-danger w-full"
          onClick={onLogout}
          leftIcon={<LogoutIcon />}
        >
          Sign Out / Logout
        </Button>
      </div>
    </div>
  );
}

// ── Settings Modal ─────────────────────────────────────────────────────────────

function SettingsModal({
  isOpen,
  onClose,
  userEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 overlay animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-elevated border border-border-primary rounded-2xl shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span>⚙️</span> EarthIQ Settings
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col gap-4">
          <div className="form-field">
            <label className="form-label">Map Display Units</label>
            <select className="input select" defaultValue="metric">
              <option value="metric">Metric (Meters, Kilometers)</option>
              <option value="imperial">Imperial (Feet, Miles)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Default Vector Basemap</label>
            <select className="input select" defaultValue="dataviz-dark">
              <option value="dataviz-dark">Dark Matter (CARTO)</option>
              <option value="dataviz-light">Positron Light (CARTO)</option>
              <option value="satellite">Voyager Satellite</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Default Coordinate System</label>
            <input
              type="text"
              className="input bg-surface-hover cursor-not-allowed"
              defaultValue="EPSG:4326 - WGS 84"
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="form-label">Account Email</label>
            <input
              type="text"
              className="input bg-surface-hover cursor-not-allowed"
              value={userEmail}
              readOnly
            />
          </div>

          <div className="flex justify-end mt-2">
            <button onClick={onClose} className="btn btn-primary btn-md">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AppShell ──────────────────────────────────────────────────────────────

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
  const adminNav = user?.is_superuser
    ? [{ label: "Admin", to: "/admin", icon: "🛡️" }]
    : [];
  const allNav = [...CORE_NAV, ...adminNav, ...moduleNav];

  const isMapView = location.pathname.startsWith("/map");

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  // Sidebar width classes
  const sidebarWidth = isMapView
    ? "w-0 -translate-x-full"
    : isCollapsed
      ? "w-16"
      : "w-64";

  const mainOffset = isMapView ? "ml-0" : isCollapsed ? "ml-16" : "ml-64";

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col bg-surface border-r border-border-primary transition-all duration-300 ease-in-out ${sidebarWidth} overflow-hidden`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center shrink-0 border-b border-border-secondary h-14 ${isCollapsed ? "justify-center px-0" : "justify-between px-4"}`}
        >
          {!isCollapsed ? (
            <>
              <NavLink
                to="/dashboard"
                className="flex items-center gap-2.5 text-text-primary no-underline hover:text-primary transition-colors duration-150"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 shrink-0" />
                <span className="font-bold text-sm tracking-tight">
                  EarthIQ
                </span>
              </NavLink>

              <button
                className="btn btn-ghost btn-icon btn-xs text-text-tertiary hover:text-text-primary cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title="Collapse sidebar"
                aria-label="Toggle sidebar"
              >
                <ChevronIcon collapsed={false} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-text-primary cursor-pointer"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title="Expand sidebar"
              aria-label="Toggle sidebar"
            >
              <ChevronIcon collapsed={true} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[0.6rem] font-bold uppercase tracking-widest text-text-quaternary select-none">
              Main Navigation
            </div>
          )}

          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                } ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : "w-full"}`
              }
            >
              <span className="text-base leading-none shrink-0">
                {item.icon || "📍"}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer / User */}
        <div
          className="relative px-2 pb-3 pt-2 border-t border-border-secondary shrink-0"
          ref={popoverRef}
        >
          {/* Popover */}
          {isUserMenuOpen && (
            <UserMenuPopover
              user={user}
              activeTheme={activeTheme}
              toggleTheme={toggleTheme}
              onSettings={() => {
                setIsUserMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              onLogout={() => {
                setIsUserMenuOpen(false);
                logout();
                navigate("/login");
              }}
            />
          )}

          {/* User Button */}
          <button
            id="user-menu-btn"
            className={`flex items-center transition-colors duration-150 cursor-pointer border-none text-left rounded-xl ${
              isUserMenuOpen
                ? "bg-surface-active"
                : "bg-transparent hover:bg-surface-hover"
            } ${isCollapsed ? "w-10 h-10 mx-auto justify-center p-0" : "w-full gap-2.5 p-2"}`}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title="User Profile & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0 border border-primary/10">
              {userInitial}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-text-primary truncate">
                  {user?.email || "Account"}
                </span>
                <span className="text-[0.65rem] text-text-tertiary">
                  Administrator
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${mainOffset}`}
      >
        {/* Topbar */}
        {!isMapView && (
          <header className="navbar shrink-0 flex items-center justify-between px-4 h-14">
            {/* Left */}
            <div className="flex items-center"></div>

            {/* Center — Search */}
            <div className="flex-1 max-w-xl mx-auto px-4 py-1 border border-border-secondary rounded-lg bg-surface-hover">
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="input input-sm pl-9 pr-10 w-full"
                  placeholder="Search projects, layers, datasets, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <kbd className="absolute right-3 pointer-events-none text-[0.65rem] font-mono text-text-quaternary bg-surface-hover border border-border-primary rounded px-1.5 py-0.5">
                  /
                </kbd>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                title={`Switch to ${activeTheme === "dark" ? "Light" : "Dark"} theme`}
                className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150  "
              >
                {activeTheme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
          </header>
        )}

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isMapView ? "p-0" : "p-6 lg:p-8"
          }`}
        >
          {children}
        </main>
      </div>

      {/* ── Settings Modal ── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userEmail={user?.email || ""}
      />
    </div>
  );
}

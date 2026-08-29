import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useNotifications } from "@/lib/notifications";
import { useModules } from "@/lib/modules";
import { usePermissions } from "@/lib/usePermissions";
import { initials, timeAgo } from "@/lib/format";
import {
  moduleRegistry,
  type ModuleBundle,
} from "../module-registry.generated";
import {
  Search,
  Bell,
  BellOff,
  CheckCheck,
  Settings,
  Sun,
  Moon,
  LogOut,
  X,
} from "lucide-react";

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
 * Configurable icon map for installed modules.
 * Can be configured via icon name or module name.
 */
const MODULE_ICON_MAP: Record<string, string> = {
  "ai-module": "🤖",
  "hydrology-module": "💧",
  "resources-module": "📚",
  "analytics-module": "📈",
  "climate-module": "🌍",
  "biodiversity-module": "🌿",
  "satellite-module": "🛰️",
};

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
          icon: bundle.navItem.icon || MODULE_ICON_MAP[m.name] || "🧩",
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

// ── User Menu Popover ──────────────────────────────────────────────────────────

function UserMenuPopover({
  user,
  activeTheme,
  toggleTheme,
  onSettings,
  onNotifications,
  onLogout,
  collapsed,
  anchorRect,
}: {
  user: { email?: string; full_name?: string; is_superuser?: boolean } | null;
  activeTheme: string;
  toggleTheme: () => void;
  onSettings: () => void;
  onNotifications: () => void;
  onLogout: () => void;
  /** Sidebar collapsed → the menu pops out to the right of the avatar. */
  collapsed: boolean;
  /** Bounding rect of the avatar button (used to anchor the popped-out menu). */
  anchorRect: DOMRect | null;
}) {
  const displayName = user?.full_name || user?.email || "Signed In User";
  const itemClass =
    "group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium " +
    "text-text-secondary hover:bg-surface-hover hover:text-text-primary " +
    "transition-colors duration-100 cursor-pointer";

  // Collapsed sidebar: anchor a fixed-size menu just outside the sidebar,
  // bottom-aligned with the avatar button (sidebar has overflow-hidden,
  // so we must escape it via fixed positioning).
  const MENU_WIDTH = 288;
  const collapsedStyle: React.CSSProperties | undefined =
    collapsed && anchorRect
      ? {
          left: Math.min(
            anchorRect.right + 8,
            Math.max(8, window.innerWidth - MENU_WIDTH - 8),
          ),
          bottom: Math.max(8, window.innerHeight - anchorRect.top + 8),
          width: MENU_WIDTH,
        }
      : undefined;

  return (
    <div
      className={
        (collapsed
          ? "fixed "
          : "absolute bottom-full left-0 right-0 w-full min-w-[15rem] ") +
        "mb-2 bg-elevated border border-border-primary rounded-xl shadow-xl animate-fade-in-up z-50 overflow-hidden"
      }
      style={collapsedStyle}
    >
      {/* User Info Header */}
      <div className="flex items-center gap-3 px-3.5 py-3 border-b border-border-secondary bg-surface-hover/50">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center shrink-0 border border-primary/10">
          {initials(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-text-primary truncate">
            {displayName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[0.65rem] text-text-tertiary truncate">
              {user?.email}
            </span>
            {user?.is_superuser && (
              <span className="shrink-0 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-px rounded-full bg-primary/10 text-primary border border-primary/15">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1.5">
        <button className={itemClass} onClick={onSettings}>
          <Settings size={15} className="shrink-0 text-text-tertiary group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left">Profile &amp; Settings</span>
          <span className="text-[0.65rem] text-text-tertiary group-hover:text-primary transition-colors">→</span>
        </button>

        <button className={itemClass} onClick={onNotifications}>
          <Bell size={15} className="shrink-0 text-text-tertiary group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left">Notifications</span>
          <span className="text-[0.65rem] text-text-tertiary group-hover:text-primary transition-colors">→</span>
        </button>

        <button className={itemClass} onClick={toggleTheme}>
          {activeTheme === "dark" ? (
            <Sun size={15} className="shrink-0 text-text-tertiary group-hover:text-primary transition-colors" />
          ) : (
            <Moon size={15} className="shrink-0 text-text-tertiary group-hover:text-primary transition-colors" />
          )}
          <span className="flex-1 text-left">
            {activeTheme === "dark" ? "Light mode" : "Dark mode"}
          </span>
          <span className="w-8 h-4.5 rounded-full border border-border-primary relative shrink-0">
            <span
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-sm transition-all duration-200"
              style={{
                left: activeTheme === "dark" ? "calc(100% - 0.95rem)" : "0.2rem",
              }}
            />
          </span>
        </button>
      </div>

      {/* Footer — Sign Out */}
      <div className="border-t border-border-secondary py-1.5">
        <button
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-error hover:bg-error-subtle transition-colors duration-100 cursor-pointer"
          onClick={onLogout}
        >
          <LogOut size={15} className="shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Notification Bell (topbar) ─────────────────────────────────────────────────
//
// Replaces the old static "Settings" modal. Shows the live unread badge and
// a quick dropdown (recent items, mark-all-read, open the full center).

function NotificationBell() {
  const { unread, items, connected, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const recent = items.slice(0, 5);

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn btn-ghost btn-icon btn-sm text-text-secondary hover:text-text-primary relative"
        title={connected ? "Notifications" : "Notifications (offline)"}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unread} unread)`}
      >
        {unread > 0 ? <Bell size={18} /> : <BellOff size={18} />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[0.95rem] h-[0.95rem] px-1 rounded-full bg-error text-white text-[0.6rem] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(92vw,21rem)] bg-elevated border border-border-primary rounded-xl shadow-dropdown animate-fade-in-up z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-secondary flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              Notifications
              <span
                className={`ml-2 text-[0.6rem] px-1.5 py-0.5 rounded-full border ${
                  connected
                    ? "bg-success-subtle text-success border-success/20"
                    : "bg-error-subtle text-error border-error/20"
                }`}
              >
                {connected ? "live" : "offline"}
              </span>
            </span>
            {unread > 0 && (
              <button
                className="text-xs text-primary cursor-pointer no-underline"
                onClick={markAllRead}
              >
                <CheckCheck size={13} className="inline mr-1" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-text-tertiary">
                No notifications yet — you're all caught up.
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  className="w-full text-left px-4 py-3 border-b border-border-secondary last:border-0 hover:bg-surface-hover transition-colors cursor-pointer"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    setOpen(false);
                    if (n.link && n.link.startsWith("/")) navigate(n.link);
                    else navigate("/notifications");
                  }}
                >
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <span
                      className={`text-xs truncate ${
                        n.read ? "text-text-secondary" : "font-semibold text-text-primary"
                      }`}
                    >
                      {n.title}
                    </span>
                  </div>
                  {n.body && (
                    <div className="text-[0.65rem] text-text-tertiary truncate mt-0.5">
                      {n.body}
                    </div>
                  )}
                  <div className="text-[0.6rem] text-text-tertiary mt-0.5">
                    {timeAgo(n.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border-secondary">
            <button
              className="w-full text-center text-xs font-medium text-primary cursor-pointer no-underline hover:underline"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
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
  const [searchValue, setSearchValue] = useState("");

  const popoverRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { canView } = usePermissions();
  const moduleNav = useModuleNavItems();
  const adminNav = user?.is_superuser
    ? [{ label: "Admin", to: "/admin", icon: "🛡️" }]
    : [];
  const rawNav = [...CORE_NAV, ...adminNav, ...moduleNav];
  
  // Filter nav items based on user's view permission
  const allNav = rawNav.filter((item) => {
    const compName = item.to.replace("/", "");
    // Core pages are always visible; everything else needs a view permission.
    return compName === "dashboard" || canView(compName);
  });

  // Full-bleed "builder views" — the map builder (`/map`) and every `/builder/*`
  // page hide the shell sidebar + topbar. Each renders its own chrome, similar
  // to the standalone published-map experience.
  const isStandaloneView =
    location.pathname.startsWith("/map") ||
    location.pathname.startsWith("/builder/");

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

  // If the menu is open in collapsed (fixed-position) mode and the window is
  // resized, close it so the anchored position never goes stale.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const close = () => setIsUserMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [isUserMenuOpen]);

  // Search shortcuts: "/" focuses the search box (when not already typing in
  // a field), Escape clears it and blurs — matches the visible "/" kbd hint.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const isTyping =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        Boolean(el?.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (
        e.key === "Escape" &&
        document.activeElement === searchRef.current
      ) {
        e.stopPropagation();
        setSearchValue("");
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const userInitial = user
    ? initials(user.full_name || user.email)
    : "U";

  // Sidebar width classes
  const sidebarWidth = isStandaloneView
    ? "w-0 -translate-x-full"
    : isCollapsed
      ? "w-16"
      : "w-64";

  const mainOffset = isStandaloneView
    ? "ml-0"
    : isCollapsed
      ? "ml-16"
      : "ml-64";

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
              collapsed={isCollapsed}
              anchorRect={
                isCollapsed
                  ? userBtnRef.current?.getBoundingClientRect() ?? null
                  : null
              }
              onSettings={() => {
                setIsUserMenuOpen(false);
                navigate("/settings");
              }}
              onNotifications={() => {
                setIsUserMenuOpen(false);
                navigate("/notifications");
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
            ref={userBtnRef}
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
                  {user?.full_name || user?.email || "Account"}
                </span>
                <span className="text-[0.65rem] text-text-tertiary">
                  {user?.is_superuser ? "Administrator" : "Member"}
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
        {!isStandaloneView && (
          <header className="navbar shrink-0 flex items-center justify-between px-4 h-14">
            {/* Left */}
            <div className="flex items-center"></div>

            {/* Center — Search */}
            <div className="flex-1 min-w-0 flex justify-center px-2">
              <div className="relative w-full max-w-md group">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)] group-focus-within:text-primary transition-colors duration-150"
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search projects, layers, datasets…"
                  aria-label="Search"
                  className="w-full h-9 rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--input-bg)] pl-9 pr-16 text-xs text-[var(--text-primary)] transition-all duration-150 focus:outline-none focus:border-[var(--input-focus-border)] focus:shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h/0.15)]"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchValue("");
                        searchRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="p-0.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <kbd className="hidden sm:flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md border border-[var(--border-primary)] bg-[var(--surface-hover)] text-[0.6rem] font-semibold text-[var(--text-tertiary)] select-none pointer-events-none">
                    /
                  </kbd>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>
          </header>
        )}

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isStandaloneView ? "p-0" : "p-6 lg:p-8"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

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
import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { initials, timeAgo } from "@/lib/format";
import { useModules } from "@/lib/modules";
import { useNotifications } from "@/lib/notifications";
import { useTheme } from "@/lib/theme";
import { usePermissions } from "@/lib/usePermissions";
import { moduleRegistry, type ModuleBundle } from "@/module-registry.generated";

import { Logo, LogoMark } from "./Logo";

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
      (m) => m.enabled && m.name in moduleRegistry
    );
    if (!enabled.length) return;

    Promise.all(
      enabled.map((m) =>
        moduleRegistry[m.name]().then((bundle: ModuleBundle) => ({
          ...bundle.navItem,
          icon: bundle.navItem.icon || MODULE_ICON_MAP[m.name] || "🧩",
        }))
      )
    ).then(setNavItems);
  }, [modules]);

  return navItems;
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => {
  return (
    <svg
      className="shrink-0"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {collapsed ? (
        <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
      ) : (
        <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
      )}
    </svg>
  );
};

// ── User Menu Popover ──────────────────────────────────────────────────────────

const UserMenuPopover = ({
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
}) => {
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
            Math.max(8, window.innerWidth - MENU_WIDTH - 8)
          ),
          bottom: Math.max(8, window.innerHeight - anchorRect.top + 8),
          width: MENU_WIDTH,
        }
      : undefined;

  return (
    <div
      style={collapsedStyle}
      className={
        (collapsed
          ? "fixed "
          : "absolute right-0 bottom-full left-0 w-full min-w-[15rem] ") +
        "bg-elevated border-border-primary animate-fade-in-up z-50 mb-2 overflow-hidden rounded-xl border shadow-xl"
      }
    >
      {/* User Info Header */}
      <div className="border-border-secondary bg-surface-hover/50 flex items-center gap-3 border-b px-3.5 py-3">
        <div className="bg-primary/15 text-primary border-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
          {initials(displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-text-primary truncate text-xs font-semibold">
            {displayName}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-text-tertiary truncate text-[0.65rem]">
              {user?.email}
            </span>
            {user?.is_superuser ? (
              <span className="bg-primary/10 text-primary border-primary/15 shrink-0 rounded-full border px-1.5 py-px text-[0.55rem] font-bold tracking-wide uppercase">
                Admin
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1.5">
        <button
          className={itemClass}
          onClick={onSettings}
        >
          <Settings
            className="text-text-tertiary group-hover:text-primary shrink-0 transition-colors"
            size={15}
          />
          <span className="flex-1 text-left">Profile &amp; Settings</span>
          <span className="text-text-tertiary group-hover:text-primary text-[0.65rem] transition-colors">
            →
          </span>
        </button>

        <button
          className={itemClass}
          onClick={onNotifications}
        >
          <Bell
            className="text-text-tertiary group-hover:text-primary shrink-0 transition-colors"
            size={15}
          />
          <span className="flex-1 text-left">Notifications</span>
          <span className="text-text-tertiary group-hover:text-primary text-[0.65rem] transition-colors">
            →
          </span>
        </button>

        <button
          className={itemClass}
          onClick={toggleTheme}
        >
          {activeTheme === "dark" ? (
            <Sun
              className="text-text-tertiary group-hover:text-primary shrink-0 transition-colors"
              size={15}
            />
          ) : (
            <Moon
              className="text-text-tertiary group-hover:text-primary shrink-0 transition-colors"
              size={15}
            />
          )}
          <span className="flex-1 text-left">
            {activeTheme === "dark" ? "Light mode" : "Dark mode"}
          </span>
          <span className="border-border-primary relative h-4.5 w-8 shrink-0 rounded-full border">
            <span
              className="bg-primary absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow-sm transition-all duration-200"
              style={{
                left:
                  activeTheme === "dark" ? "calc(100% - 0.95rem)" : "0.2rem",
              }}
            />
          </span>
        </button>
      </div>

      {/* Footer - Sign Out */}
      <div className="border-border-secondary border-t py-1.5">
        <button
          className="text-error hover:bg-error-subtle flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors duration-100"
          onClick={onLogout}
        >
          <LogOut
            className="shrink-0"
            size={15}
          />
          Sign out
        </button>
      </div>
    </div>
  );
};

// ── Notification Bell (topbar) ─────────────────────────────────────────────────
//
// Replaces the old static "Settings" modal. Shows the live unread badge and
// a quick dropdown (recent items, mark-all-read, open the full center).

const NotificationBell = () => {
  const { unread, items, connected, markAllRead, markRead } =
    useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const recent = items.slice(0, 5);

  return (
    <div
      ref={ref}
      className="relative"
    >
      <button
        aria-label={`Notifications (${unread} unread)`}
        className="btn btn-ghost btn-icon btn-sm text-text-secondary hover:text-text-primary relative"
        title={connected ? "Notifications" : "Notifications (offline)"}
        onClick={() => setOpen((o) => !o)}
      >
        {unread > 0 ? <Bell size={18} /> : <BellOff size={18} />}
        {unread > 0 && (
          <span className="bg-error absolute -top-0.5 -right-0.5 flex h-[0.95rem] min-w-[0.95rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open ? (
        <div className="bg-elevated border-border-primary shadow-dropdown animate-fade-in-up absolute top-full right-0 z-50 mt-2 w-[min(92vw,21rem)] overflow-hidden rounded-xl border">
          <div className="border-border-secondary flex items-center justify-between border-b px-4 py-3">
            <span className="text-text-primary text-sm font-semibold">
              Notifications
              <span
                className={`ml-2 rounded-full border px-1.5 py-0.5 text-[0.6rem] ${
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
                className="text-primary cursor-pointer text-xs no-underline"
                onClick={markAllRead}
              >
                <CheckCheck
                  className="mr-1 inline"
                  size={13}
                />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="text-text-tertiary px-4 py-8 text-center text-xs">
                No notifications yet - you're all caught up.
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  className="border-border-secondary hover:bg-surface-hover w-full cursor-pointer border-b px-4 py-3 text-left transition-colors last:border-0"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    setOpen(false);
                    if (n.link && n.link.startsWith("/")) navigate(n.link);
                    else navigate("/notifications");
                  }}
                >
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                    )}
                    <span
                      className={`truncate text-xs ${
                        n.read
                          ? "text-text-secondary"
                          : "text-text-primary font-semibold"
                      }`}
                    >
                      {n.title}
                    </span>
                  </div>
                  {n.body ? (
                    <div className="text-text-tertiary mt-0.5 truncate text-[0.65rem]">
                      {n.body}
                    </div>
                  ) : null}
                  <div className="text-text-tertiary mt-0.5 text-[0.6rem]">
                    {timeAgo(n.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-border-secondary border-t px-4 py-2.5">
            <button
              className="text-primary w-full cursor-pointer text-center text-xs font-medium no-underline hover:underline"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ── Main AppShell ──────────────────────────────────────────────────────────────

export const AppShell = ({ children }: { children: React.ReactNode }) => {
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

  // Full-bleed "builder views" - the map builder (`/map`) and every `/builder/*`
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
  // a field), Escape clears it and blurs - matches the visible "/" kbd hint.
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

  const userInitial = user ? initials(user.full_name || user.email) : "U";

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
    <div className="bg-base flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`bg-surface border-border-primary fixed top-0 left-0 z-30 flex h-full flex-col border-r transition-all duration-300 ease-in-out ${sidebarWidth} overflow-hidden`}
      >
        {/* Brand Header */}
        <div
          className={`border-border-secondary flex h-14 shrink-0 items-center border-b ${isCollapsed ? "justify-center px-0" : "justify-between px-4"}`}
        >
          {!isCollapsed ? (
            <>
              <NavLink
                className="flex items-center no-underline transition-opacity duration-150 hover:opacity-80"
                to="/dashboard"
              >
                <Logo
                  size={28}
                  wordmarkClassName="text-sm"
                />
              </NavLink>

              <button
                aria-label="Toggle sidebar"
                className="btn btn-ghost btn-icon btn-xs text-text-tertiary hover:text-text-primary cursor-pointer"
                title="Collapse sidebar"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <ChevronIcon collapsed={false} />
              </button>
            </>
          ) : (
            <button
              aria-label="Expand sidebar"
              className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0"
              title="Expand sidebar"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <LogoMark
                className="transition-opacity duration-150 hover:opacity-80"
                size={34}
              />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
          {!isCollapsed && (
            <div className="text-text-quaternary mb-2 px-3 text-[0.6rem] font-bold tracking-widest uppercase select-none">
              Main Navigation
            </div>
          )}

          {allNav.map((item) => (
            <NavLink
              key={item.to}
              title={isCollapsed ? item.label : undefined}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                } ${isCollapsed ? "mx-auto h-10 w-10 justify-center px-0" : "w-full"}`
              }
            >
              <span className="shrink-0 text-base leading-none">
                {item.icon || "📍"}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer / User */}
        <div
          ref={popoverRef}
          className="border-border-secondary relative shrink-0 border-t px-2 pt-2 pb-3"
        >
          {/* Popover */}
          {isUserMenuOpen ? (
            <UserMenuPopover
              activeTheme={activeTheme}
              collapsed={isCollapsed}
              toggleTheme={toggleTheme}
              user={user}
              anchorRect={
                isCollapsed
                  ? (userBtnRef.current?.getBoundingClientRect() ?? null)
                  : null
              }
              onLogout={() => {
                setIsUserMenuOpen(false);
                logout();
                navigate("/login");
              }}
              onNotifications={() => {
                setIsUserMenuOpen(false);
                navigate("/notifications");
              }}
              onSettings={() => {
                setIsUserMenuOpen(false);
                navigate("/settings");
              }}
            />
          ) : null}

          {/* User Button */}
          <button
            ref={userBtnRef}
            id="user-menu-btn"
            title="User Profile & Settings"
            className={`flex cursor-pointer items-center rounded-xl border-none text-left transition-colors duration-150 ${
              isUserMenuOpen
                ? "bg-surface-active"
                : "hover:bg-surface-hover bg-transparent"
            } ${isCollapsed ? "mx-auto h-10 w-10 justify-center p-0" : "w-full gap-2.5 p-2"}`}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="bg-primary/15 text-primary border-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
              {userInitial}
            </div>
            {!isCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="text-text-primary truncate text-xs font-semibold">
                  {user?.full_name || user?.email || "Account"}
                </span>
                <span className="text-text-tertiary text-[0.65rem]">
                  {user?.is_superuser ? "Administrator" : "Member"}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${mainOffset}`}
      >
        {/* Topbar */}
        {!isStandaloneView && (
          <header className="navbar flex h-14 shrink-0 items-center justify-between px-4">
            {/* Left */}
            <div className="flex items-center" />

            {/* Center - Search */}
            <div className="flex min-w-0 flex-1 justify-center px-2">
              <div className="group relative w-full max-w-md">
                <Search
                  className="group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-tertiary)] transition-colors duration-150"
                  size={15}
                />
                <input
                  ref={searchRef}
                  aria-label="Search"
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--input-bg)] pr-16 pl-9 text-xs text-[var(--text-primary)] transition-all duration-150 focus:border-[var(--input-focus-border)] focus:shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h/0.15)] focus:outline-none"
                  placeholder="Search projects, layers, datasets…"
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1.5">
                  {searchValue ? (
                    <button
                      aria-label="Clear search"
                      className="cursor-pointer rounded-md p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      type="button"
                      onClick={() => {
                        setSearchValue("");
                        searchRef.current?.focus();
                      }}
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                  <kbd className="pointer-events-none hidden h-5 min-w-5 items-center justify-center rounded-md border border-[var(--border-primary)] bg-[var(--surface-hover)] px-1.5 text-[0.6rem] font-semibold text-[var(--text-tertiary)] select-none sm:flex">
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
};

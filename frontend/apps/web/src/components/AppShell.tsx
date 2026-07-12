import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useModules } from "@/lib/modules";
import { moduleRegistry, type ModuleBundle } from "../module-registry.generated";

interface NavItem { label: string; to: string }

const CORE_NAV: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
  },
  {
    label: "Map",
    to: "/map",
  },
];

/**
 * Loads navItem from each enabled module's bundle (lazy, cached).
 * Only fires for modules that are both enabled AND in the registry.
 */
function useModuleNavItems(): NavItem[] {
  const { modules } = useModules();
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const enabled = modules.filter((m) => m.enabled && m.name in moduleRegistry);
    if (!enabled.length) return;

    Promise.all(
      enabled.map((m) =>
        moduleRegistry[m.name]().then((bundle: ModuleBundle) => bundle.navItem)
      )
    ).then(setNavItems);
  }, [modules]);

  return navItems;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const moduleNav = useModuleNavItems();
  const allNav = [...CORE_NAV, ...moduleNav];

  return (
    <div className="eq-shell">
      <header className="eq-topnav">
        <NavLink to="/dashboard" className="eq-topnav__brand">
          <span className="eq-topnav__brand-dot" />
          EarthIQ
        </NavLink>

        <nav className="eq-topnav__nav" aria-label="Main navigation">
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `eq-topnav__link${isActive ? " active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="eq-topnav__spacer" />

        <button
          id="user-menu-btn"
          className="eq-topnav__user"
          onClick={() => { logout(); navigate("/login"); }}
          title="Sign out"
          aria-label="Sign out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {user?.email ?? "Account"}
        </button>
      </header>

      <main className="eq-main">
        <div className="eq-content">{children}</div>
      </main>
    </div>
  );
}

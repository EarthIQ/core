/**
 * Settings - the user's personalization center (core).
 *
 * Tabs:
 *   • Profile       - identity, bio, contact, password   (PUT /api/v1/profile/me)
 *   • Appearance    - theme, accent, font scale, density (PUT /api/v1/profile/me/preferences)
 *   • Notifications - delivery settings                  (PUT /api/v1/notifications/preferences)
 *   • Organization  - orgs, members, roles               (PUT /api/v1/profile/organizations…)
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AppearanceSection from "@/components/settings/AppearanceSection";
import NotificationPrefsSection from "@/components/settings/NotificationPrefsSection";
import OrganizationSection from "@/components/settings/OrganizationSection";
import ProfileSection from "@/components/settings/ProfileSection";

const TABS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "appearance", label: "Appearance", icon: "🎨" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "organization", label: "Organization", icon: "🏢" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ?tab= deep link support (e.g. /settings?tab=appearance).
  const requested = new URLSearchParams(location.search).get("tab");
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === requested) ? (requested as TabId) : "profile"
  );

  function selectTab(id: TabId) {
    setTab(id);
    const search = new URLSearchParams(location.search);
    search.set("tab", id);
    navigate(
      { pathname: location.pathname, search: search.toString() },
      { replace: true }
    );
  }

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <div className="bg-elevated border-border-primary sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h1 className="text-text-primary text-lg font-bold">Settings</h1>
            <p className="text-text-secondary mt-0.5 text-xs">
              Personalize your account, appearance and workspace.
            </p>
          </div>
          <a
            className="text-text-tertiary hover:text-text-primary text-xs no-underline"
            href="/dashboard"
          >
            ← Back to dashboard
          </a>
        </div>
        {/* ── Tabs ── */}
        <div
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              aria-selected={tab === t.id}
              role="tab"
              className={`cursor-pointer rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "text-text-secondary hover:bg-surface-hover border-transparent"
              }`}
              onClick={() => selectTab(t.id)}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Panel ── */}
      <div className="mx-auto max-w-6xl p-6">
        {tab === "profile" && <ProfileSection />}
        {tab === "appearance" && <AppearanceSection />}
        {tab === "notifications" && <NotificationPrefsSection />}
        {tab === "organization" && <OrganizationSection />}
      </div>
    </div>
  );
}

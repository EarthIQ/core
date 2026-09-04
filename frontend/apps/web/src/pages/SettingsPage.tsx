/**
 * Settings — the user's personalization center (core).
 *
 * Tabs:
 *   • Profile       — identity, bio, contact, password   (PUT /api/v1/profile/me)
 *   • Appearance    — theme, accent, font scale, density (PUT /api/v1/profile/me/preferences)
 *   • Notifications — delivery settings                  (PUT /api/v1/notifications/preferences)
 *   • Organization  — orgs, members, roles               (PUT /api/v1/profile/organizations…)
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProfileSection from "@/components/settings/ProfileSection";
import AppearanceSection from "@/components/settings/AppearanceSection";
import NotificationPrefsSection from "@/components/settings/NotificationPrefsSection";
import OrganizationSection from "@/components/settings/OrganizationSection";

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
    TABS.some((t) => t.id === requested) ? (requested as TabId) : "profile",
  );

  function selectTab(id: TabId) {
    setTab(id);
    const search = new URLSearchParams(location.search);
    search.set("tab", id);
    navigate({ pathname: location.pathname, search: search.toString() }, { replace: true });
  }

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-elevated border-b border-border-primary backdrop-blur">
        <div className="px-6 pt-5 pb-3 max-w-6xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Settings</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Personalize your account, appearance and workspace.
            </p>
          </div>
          <a
            href="/dashboard"
            className="text-xs text-text-tertiary hover:text-text-primary no-underline"
          >
            ← Back to dashboard
          </a>
        </div>
        {/* ── Tabs ── */}
        <div className="px-6 max-w-6xl mx-auto flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:bg-surface-hover"
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
      <div className="p-6 max-w-6xl mx-auto">
        {tab === "profile" && <ProfileSection />}
        {tab === "appearance" && <AppearanceSection />}
        {tab === "notifications" && <NotificationPrefsSection />}
        {tab === "organization" && <OrganizationSection />}
      </div>
    </div>
  );
}
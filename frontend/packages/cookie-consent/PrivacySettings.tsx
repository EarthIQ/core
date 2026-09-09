// apps/web/src/pages/PrivacySettings.tsx

import { useCookieConsent } from "@your-org/cookie-consent";

export function PrivacySettings() {
  const { preferences, openSettings, resetPreferences, hasConsented } =
    useCookieConsent();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Privacy Settings</h1>

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Current Cookie Preferences
        </h2>

        {hasConsented ? (
          <div className="space-y-3">
            {Object.entries(preferences).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between"
              >
                <span className="capitalize">{key}</span>
                <span
                  className={`badge ${value ? "badge-success" : "badge-error"}`}
                >
                  {value ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No consent recorded yet.</p>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={openSettings}
          className="btn btn-primary"
        >
          Manage Cookies
        </button>
        <button
          onClick={resetPreferences}
          className="btn btn-secondary"
        >
          Reset All Preferences
        </button>
      </div>
    </div>
  );
}

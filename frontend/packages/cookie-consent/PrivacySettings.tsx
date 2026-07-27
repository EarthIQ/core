// apps/web/src/pages/PrivacySettings.tsx

import { useCookieConsent } from '@your-org/cookie-consent';

export function PrivacySettings() {
  const { preferences, openSettings, resetPreferences, hasConsented } = useCookieConsent();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Privacy Settings</h1>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Cookie Preferences</h2>

        {hasConsented ? (
          <div className="space-y-3">
            {Object.entries(preferences).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="capitalize">{key}</span>
                <span
                  className={`badge ${value ? 'badge-success' : 'badge-error'}`}
                >
                  {value ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No consent recorded yet.</p>
        )}
      </div>

      <div className="flex gap-4">
        <button onClick={openSettings} className="btn btn-primary">
          Manage Cookies
        </button>
        <button onClick={resetPreferences} className="btn btn-secondary">
          Reset All Preferences
        </button>
      </div>
    </div>
  );
}
// apps/web/src/App.tsx

import { CookieBanner, CookieSettingsButton } from '@packages/cookie-consent';
import '@your-org/cookie-consent/styles.css';

function App() {
  return (
    <div className="app">
      <main>
        <h1>Welcome to My App</h1>
      </main>

      <CookieBanner
        config={{
          privacyPolicyUrl: '/privacy',
          cookiePolicyUrl: '/cookies',
          consentVersion: '1.0',
          position: 'bottom',
          onConsentChange: (preferences) => {
            console.log('Consent changed:', preferences);
          },
        }}
      />
      <CookieSettingsButton position="bottom-left" />
    </div>
  );
}

export default App;
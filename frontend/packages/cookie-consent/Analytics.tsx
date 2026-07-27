// apps/web/src/components/Analytics.tsx

import { useConsentAwareScript, initializeGoogleAnalytics } from '@your-org/cookie-consent';

const GA_ID = import.meta.env.VITE_GA_ID;

export function Analytics() {
  useConsentAwareScript('analytics', () => {
    if (GA_ID) {
      initializeGoogleAnalytics(GA_ID);
      console.log('Analytics initialized');
    }

    return () => {
      console.log('Analytics disabled');
    };
  }, []);

  return null;
}
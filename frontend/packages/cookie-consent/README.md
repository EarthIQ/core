# @your-org/cookie-consent

A modern, accessible, and customizable cookie consent solution for React applications. GDPR and CCPA compliant.

## Features

- 🎨 **Modern UI** - Beautiful, responsive design with dark mode support
- ♿ **Accessible** - Full keyboard navigation, ARIA labels, focus management
- 🔧 **Customizable** - Configure categories, positions, and styling
- 📱 **Responsive** - Works great on mobile and desktop
- 🔒 **Privacy-focused** - GDPR and CCPA compliant
- ⚡ **Lightweight** - Tree-shakeable, minimal dependencies
- 🎯 **TypeScript** - Full type safety

## Installation

```bash
pnpm add @your-org/cookie-consent

Quick Start
import { CookieBanner, CookieSettingsButton } from '@your-org/cookie-consent';
import '@your-org/cookie-consent/styles.css';

function App() {
  return (
    <>
      <YourApp />
      <CookieBanner
        config={{
            privacyPolicyUrl: '/privacy',
          cookiePolicyUrl: '/cookies',
          consentVersion: '1.0',
          position: 'bottom',
        }}
      />
      <CookieSettingsButton position="bottom-left" />
    </>
  );
}

Configuration
CookieBanner Props
Prop	Type	Description
config	CookieConsentConfig	Configuration object
CookieConsentConfig
TypeScript

interface CookieConsentConfig {
  privacyPolicyUrl?: string;      // URL to privacy policy
  cookiePolicyUrl?: string;       // URL to cookie policy
  consentVersion?: string;        // Version string (changing re-prompts users)
  expiryDays?: number;            // Days until consent expires (default: 365)
  position?: BannerPosition;      // 'bottom' | 'bottom-left' | 'bottom-right' | 'top'
  categories?: CookieCategoryConfig[]; // Custom category configurations
  onConsentChange?: (prefs: CookiePreferences) => void; // Callback on consent change
}
Hooks
useCookieConsent
Main hook for accessing consent state and actions.

React

import { useCookieConsent } from '@your-org/cookie-consent';

function MyComponent() {
  const {
    preferences,
    hasConsented,
    canTrack,
    canShowAds,
    openSettings,
    acceptAll,
    rejectAll,
  } = useCookieConsent();

  if (canTrack()) {
    // Initialize analytics
  }

  return (
    <button onClick={openSettings}>
      Manage Cookies
    </button>
  );
}
useConsentAwareScript
Run scripts only when consent is given for a specific category.

React

import { useConsentAwareScript } from '@your-org/cookie-consent';

function Analytics() {
  useConsentAwareScript('analytics', () => {
    // This only runs when analytics consent is given
    initializeGoogleAnalytics('G-XXXXXXXXXX');
    
    return () => {
      // Cleanup when consent is revoked
    };
  });

  return null;
}
useConsentListener
Listen for consent changes globally.

React

import { useConsentListener } from '@your-org/cookie-consent';

function ConsentWatcher() {
  useConsentListener((preferences) => {
    console.log('Consent updated:', preferences);
    
    if (preferences.analytics) {
      // Enable analytics
    } else {
      // Disable analytics
    }
  });

  return null;
}
Custom Categories
React

import { CookieBanner, CookieCategoryConfig } from '@your-org/cookie-consent';

const customCategories: CookieCategoryConfig[] = [
  {
    id: 'necessary',
    name: 'Essential',
    description: 'Required for the website to function.',
    required: true,
    cookies: [
      {
        name: 'session',
        provider: 'Our Website',
        purpose: 'Session management',
        expiry: 'Session',
        type: 'http',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us improve our website.',
    cookies: [
      {
        name: '_ga',
        provider: 'Google',
        purpose: 'Analytics tracking',
        expiry: '2 years',
        type: 'http',
      },
    ],
  },
];

<CookieBanner config={{ categories: customCategories }} />
Styling
The package includes a CSS file with all styles. Import it in your app:

React

import '@your-org/cookie-consent/styles.css';
CSS Custom Properties
The component uses CSS custom properties that integrate with your design system:

CSS

:root {
  --primary: oklch(0.55 0.2 145);
  --bg-elevated: #ffffff;
  --text-primary: #1a1a2e;
  --border-primary: #e5e7eb;
  /* ... and more */
}
Tailwind CSS Integration
If you're using Tailwind with the CSS variables from your theme, the component will automatically use your design tokens.

Events
The package dispatches custom events for external integration:

TypeScript

// Listen for consent updates
window.addEventListener('cookieConsentUpdate', (event) => {
  console.log('Preferences:', event.detail.preferences);
});

// Listen for initialization
window.addEventListener('cookieConsentInitialized', (event) => {
  console.log('Is new user:', event.detail.isNewUser);
});
Server-Side Rendering
The package is SSR-safe and works with Next.js, Remix, and other frameworks.

React

// Next.js App Router
'use client';

import { CookieBanner } from '@your-org/cookie-consent';

export function CookieConsentProvider({ children }) {
  return (
    <>
      {children}
      <CookieBanner config={{ /* ... */ }} />
    </>
  );
}
# @workspace/accessibility

A comprehensive, accessible accessibility widget for React applications. Provides users with extensive customization options for visual preferences, reading aids, and navigation enhancements.

## Features

- 🎯 **Quick Profiles**: Pre-configured settings for common accessibility needs
  - Low Vision
  - Blind/Screen Reader
  - Dyslexia
  - Color Blind
  - Motor Impaired
  - ADHD
  - Cognitive

- ⚙️ **Customizable Settings**:
  - Font size (4 levels)
  - Contrast modes (normal, high, inverted)
  - Color saturation (normal, low, grayscale)
  - Line height, letter spacing, word spacing
  - Text alignment
  - Cursor size
  - Dyslexic-friendly font (OpenDyslexic)
  - Reduced motion
  - Link and heading highlighting
  - Enhanced focus indicators
  - Hide images
  - Reading guide and reading mask

- 🌍 **Internationalization**: Built-in support for 9 languages
  - English, Spanish, French, German, Arabic, Hindi, Chinese, Japanese, Portuguese

- 💾 **Persistent Settings**: Automatically saved to localStorage

- ♿ **Fully Accessible**: WCAG 2.1 compliant with full keyboard navigation and screen reader support

## Installation

```bash
pnpm add @workspace/accessibility

Usage
Basic Setup
React

import { AccessibilityProvider } from '@workspace/accessibility';
import '@workspace/accessibility/styles';

function App() {
  return (
    <AccessibilityProvider>
      <YourApp />
    </AccessibilityProvider>
  );
}
With Custom Options
React

import { AccessibilityProvider } from '@workspace/accessibility';
import '@workspace/accessibility/styles';

function App() {
  return (
    <AccessibilityProvider
      localeStorageKey="my-app-locale"
      defaultLocale="es"
      settingsStorageKey="my-app-a11y"
      customDefaults={{
        fontSize: 1,
        focusIndicator: true,
      }}
    >
      <YourApp />
    </AccessibilityProvider>
  );
}
Using the Hook
React

import { useAccessibility } from '@workspace/accessibility';

function MyComponent() {
  const { settings, updateSetting, t } = useAccessibility();

  return (
    <div>
      <p>Current font size level: {settings.fontSize}</p>
      <button onClick={() => updateSetting('fontSize', 2)}>
        {t('fontSize')}
      </button>
    </div>
  );
}
Programmatic Control
React

import { useAccessibility } from '@workspace/accessibility';

function SettingsPage() {
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    applyProfile,
    setIsOpen 
  } = useAccessibility();

  return (
    <div>
      <button onClick={() => applyProfile('dyslexia')}>
        Apply Dyslexia Profile
      </button>
      <button onClick={resetSettings}>
        Reset All Settings
      </button>
      <button onClick={() => setIsOpen(true)}>
        Open Accessibility Panel
      </button>
    </div>
  );
}
Props
AccessibilityProvider
Prop	Type	Default	Description
localeStorageKey	string	'app-locale'	localStorage key for locale
defaultLocale	Locale	'en'	Default locale if none stored
settingsStorageKey	string	'accessibility-settings'	localStorage key for settings
customDefaults	Partial<AccessibilitySettings>	{}	Override default settings
CSS Variables
The widget uses CSS variables for theming. Override these in your CSS:

CSS

:root {
  --primary: #16a34a;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --surface: #ffffff;
  --surface-hover: #f1f5f9;
  --border-primary: #e2e8f0;
  --border-secondary: #cbd5e1;
}
Preserving Elements
To prevent certain elements from being affected by accessibility styles, add the a11y-keep class:

HTML

<img src="logo.png" class="a11y-keep" alt="Logo" />
Accessibility
This widget follows WCAG 2.1 guidelines:

Full keyboard navigation
Focus trap in modal
Escape key to close
Proper ARIA labels and roles
Screen reader announcements
High contrast support
Reduced motion support
License
MIT

text


---

## Usage in Your App

Once the package is created, you can use it in your main application:

```tsx
// apps/web/src/main.tsx
import { AccessibilityProvider } from '@workspace/accessibility';
import '@workspace/accessibility/styles';

function App() {
  return (
    <AccessibilityProvider 
      defaultLocale="en"
      localeStorageKey="app-locale"
    >
      <Router>
        {/* Your app content */}
      </Router>
    </AccessibilityProvider>
  );
}
The widget will automatically appear as a floating button in the bottom-left corner. When clicked, it opens a panel with:

Profiles accordion (open by default) - showing all 7 quick profiles in a grid
Settings accordion - showing all individual settings in a grid
This structure is much cleaner and easier to maintain than the original single-file approach!







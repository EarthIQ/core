import type { translations } from '../constants/translations';

/**
 * All accessibility settings that can be configured
 */
export interface AccessibilitySettings {
  /** Text size level: 0=normal, 1=large, 2=larger, 3=largest */
  fontSize: number;
  /** Contrast mode: 0=normal, 1=high, 2=inverted */
  contrast: number;
  /** Color saturation: 0=normal, 1=low, 2=grayscale */
  saturation: number;
  /** Disable animations and transitions */
  reducedMotion: boolean;
  /** Use OpenDyslexic font */
  dyslexicFont: boolean;
  /** Highlight all links */
  highlightLinks: boolean;
  /** Highlight all headings */
  highlightHeadings: boolean;
  /** Line height: 0=normal, 1=relaxed, 2=loose */
  lineHeight: number;
  /** Letter spacing: 0=normal, 1=wide, 2=wider */
  letterSpacing: number;
  /** Word spacing: 0=normal, 1=wide, 2=wider */
  wordSpacing: number;
  /** Cursor size: 0=normal, 1=large, 2=larger */
  cursorSize: number;
  /** Enhanced focus indicators */
  focusIndicator: boolean;
  /** Hide or dim images */
  hideImages: boolean;
  /** Text alignment: 0=default, 1=left, 2=justify */
  textAlign: number;
  /** Show reading guide line */
  readingGuide: boolean;
  /** Show reading mask overlay */
  readingMask: boolean;
  /** Additional text size boost */
  biggerText: boolean;
  /** Show enhanced tooltips */
  tooltips: boolean;
  /** Currently active profile ID */
  activeProfile: string | null;
}

/**
 * Keys for translation strings
 */
export type TranslationKey = keyof typeof translations.en;

/**
 * Supported locales
 */
export type Locale = keyof typeof translations;

/**
 * Context value provided by AccessibilityProvider
 */
export interface AccessibilityContextType {
  /** Current settings */
  settings: AccessibilitySettings;
  /** Update a single setting */
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  /** Apply a predefined profile */
  applyProfile: (profileId: string) => void;
  /** Whether the widget panel is open */
  isOpen: boolean;
  /** Set panel open state */
  setIsOpen: (open: boolean) => void;
  /** Whether any accessibility settings are currently active (not at default) */
  hasActiveSettings: boolean;
  /** Translation function */
  t: (key: TranslationKey) => string;
  /** Get options array for multi-level settings */
  getOptions: (key: TranslationKey) => string[];
  /** Current locale */
  locale: Locale;
}

/**
 * Props for AccessibilityProvider
 */
export interface AccessibilityProviderProps {
  children: React.ReactNode;
  /** localStorage key for locale (default: 'app-locale') */
  localeStorageKey?: string;
  /** Default locale if none stored (default: 'en') */
  defaultLocale?: Locale;
  /** localStorage key for settings (default: 'accessibility-settings') */
  settingsStorageKey?: string;
  /** Custom default settings */
  customDefaults?: Partial<AccessibilitySettings>;
  /** Disable the automatically rendered AccessibilityWidget */
  disableDefaultWidget?: boolean;
}

/**
 * Accessibility profile definition
 */
export interface Profile {
  /** Unique identifier */
  id: string;
  /** Translation key for profile name */
  nameKey: TranslationKey;
  /** Translation key for profile description */
  descKey: TranslationKey;
  /** Emoji icon */
  icon: string;
  /** Tailwind gradient classes */
  color: string;
  /** Settings applied by this profile */
  settings: Partial<AccessibilitySettings>;
}

/**
 * Props for accordion item
 */
export interface AccordionItemProps {
  /** Unique identifier */
  id: string;
  /** Header content */
  title: React.ReactNode;
  /** Expandable content */
  children: React.ReactNode;
  /** Whether item is expanded */
  isOpen?: boolean;
  /** Called when item is toggled */
  onToggle?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Props for multi-level setting card
 */
export interface MultiLevelCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: number;
  maxLevel: number;
  options: string[];
  onChange: (value: number) => void;
}

/**
 * Props for toggle setting card
 */
export interface ToggleCardProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onChange: () => void;
}
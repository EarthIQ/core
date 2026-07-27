// Main exports
export { AccessibilityProvider } from './components/AccessibilityProvider';
export { AccessibilityWidget, type AccessibilityWidgetProps } from './components/AccessibilityWidget';
export { useAccessibility } from './hooks/useAccessibility';

// Types
export type {
  AccessibilitySettings,
  AccessibilityContextType,
  AccessibilityProviderProps,
  Profile,
  TranslationKey,
  Locale,
} from './types';

// Constants (for customization)
export { defaultSettings } from './constants/defaults';
export { profiles } from './constants/profiles';
export { translations } from './constants/translations';

// Individual components (for custom implementations)
export { ProfileCard } from './components/Profiles/ProfileCard';
export { MultiLevelCard } from './components/Settings/MultiLevelCard';
export { ToggleCard } from './components/Settings/ToggleCard';
export { ReadingGuide } from './components/ReadingAids/ReadingGuide';
export { ReadingMask } from './components/ReadingAids/ReadingMask';
export { Accordion, AccordionItem } from './components/Accordion';
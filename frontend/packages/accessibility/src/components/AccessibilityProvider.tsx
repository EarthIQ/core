import React, { useState, useMemo } from 'react';
import { AccessibilityContext } from '../context/AccessibilityContext';
import { useAccessibilitySettings } from '../hooks/useAccessibilitySettings';
import { defaultSettings } from '../constants/defaults';
import { useLocale } from '../hooks/useLocale';
import { AccessibilityWidget } from './AccessibilityWidget';
import { ReadingGuide } from './ReadingAids/ReadingGuide';
import { ReadingMask } from './ReadingAids/ReadingMask';
import type { AccessibilityProviderProps } from '../types';

/**
 * Provider component that manages accessibility state
 * Wrap your app with this to enable accessibility features
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  localeStorageKey = 'app-locale',
  defaultLocale = 'en',
  settingsStorageKey = 'accessibility-settings',
  customDefaults,
  disableDefaultWidget = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    settings,
    updateSetting,
    resetSettings,
    applyProfile,
  } = useAccessibilitySettings({
    storageKey: settingsStorageKey,
    customDefaults,
  });

  const hasActiveSettings = useMemo(() => {
    return Object.entries(settings).some(([key, value]) => {
      if (key === 'activeProfile') return false;
      const defaultValue = defaultSettings[key as keyof typeof defaultSettings];
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'boolean') return value !== false;
      return value !== defaultValue;
    });
  }, [settings]);

  const { locale, t, getOptions } = useLocale({
    storageKey: localeStorageKey,
    defaultLocale,
  });

  const contextValue = useMemo(() => ({
    settings,
    updateSetting,
    resetSettings,
    applyProfile,
    isOpen,
    setIsOpen,
    hasActiveSettings,
    t,
    getOptions,
    locale,
  }), [
    settings,
    updateSetting,
    resetSettings,
    applyProfile,
    isOpen,
    hasActiveSettings,
    t,
    getOptions,
    locale,
  ]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {!disableDefaultWidget && <AccessibilityWidget />}
      <ReadingGuide enabled={settings.readingGuide} />
      <ReadingMask enabled={settings.readingMask} />
    </AccessibilityContext.Provider>
  );
};
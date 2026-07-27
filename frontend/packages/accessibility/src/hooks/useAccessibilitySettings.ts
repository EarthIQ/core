import { useState, useCallback, useEffect } from 'react';
import type { AccessibilitySettings } from '../types';
import { defaultSettings } from '../constants/defaults';
import { profiles } from '../constants/profiles';
import { getStoredSettings, saveSettings } from '../utils/storage';
import { applySettingsToDOM } from '../utils/applySettings';

interface UseAccessibilitySettingsOptions {
  storageKey?: string;
  customDefaults?: Partial<AccessibilitySettings>;
}

/**
 * Hook for managing accessibility settings state
 */
export function useAccessibilitySettings(options: UseAccessibilitySettingsOptions = {}) {
  const { storageKey = 'accessibility-settings', customDefaults } = options;

  const [settings, setSettings] = useState<AccessibilitySettings>(() => 
    getStoredSettings(storageKey, customDefaults)
  );

  // Apply settings to DOM whenever they change
  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { 
        ...prev, 
        [key]: value, 
        activeProfile: null // Clear profile when manually changing settings
      };
      saveSettings(newSettings, storageKey);
      return newSettings;
    });
  }, [storageKey]);

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    const defaults = { ...defaultSettings, ...customDefaults };
    setSettings(defaults);
    saveSettings(defaults, storageKey);
  }, [storageKey, customDefaults]);

  // Apply a predefined profile
  const applyProfile = useCallback((profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    setSettings(prev => {
      const isActive = prev.activeProfile === profileId;
      
      if (isActive) {
        // Deactivate profile - reset to defaults
        const defaults = { ...defaultSettings, ...customDefaults };
        saveSettings(defaults, storageKey);
        return defaults;
      } else {
        // Activate profile
        const newSettings = {
          ...defaultSettings,
          ...customDefaults,
          ...profile.settings,
          activeProfile: profileId,
        };
        saveSettings(newSettings, storageKey);
        return newSettings;
      }
    });
  }, [storageKey, customDefaults]);

  // Check if any settings are active (different from defaults)
  const hasActiveSettings = Object.entries(settings).some(([key, value]) => {
    if (key === 'activeProfile') return false;
    const defaultValue = defaultSettings[key as keyof AccessibilitySettings];
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'boolean') return value !== false;
    return value !== defaultValue;
  });

  return {
    settings,
    updateSetting,
    resetSettings,
    applyProfile,
    hasActiveSettings,
  };
}
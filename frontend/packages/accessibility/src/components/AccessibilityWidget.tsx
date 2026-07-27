import React, { useRef, useMemo } from 'react';
import { useAccessibility } from '../hooks/useAccessibility';
import { TriggerButton } from './TriggerButton';
import { Panel } from './Panel';
import { Accordion, AccordionItem } from './Accordion';
import { ProfilesSection } from './Profiles';
import { SettingsSection } from './Settings';
import { defaultSettings } from '../constants/defaults';
import { Icons } from './Icons';

export interface AccessibilityWidgetProps {
  /**
   * Hide the default trigger button. You can use the useAccessibility hook to toggle.
   */
  hideTrigger?: boolean;
  /**
   * Custom trigger component.
   */
  customTrigger?: React.ReactNode | ((props: { isOpen: boolean; toggle: () => void; hasActiveSettings: boolean; ref: React.RefObject<HTMLButtonElement> }) => React.ReactNode);
  /**
   * Anchor position of the panel. Defaults to 'left'.
   */
  position?: 'left' | 'right';
}

/**
 * Main accessibility widget component
 * Renders a floating button and expandable panel with all options
 */
export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({ hideTrigger, customTrigger, position = 'left' }) => {
  const {
    settings,
    updateSetting,
    resetSettings,
    applyProfile,
    isOpen,
    setIsOpen,
    t,
    getOptions,
  } = useAccessibility();

  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if any settings are active
  const hasActiveSettings = useMemo(() => {
    return Object.entries(settings).some(([key, value]) => {
      if (key === 'activeProfile') return false;
      const defaultValue = defaultSettings[key as keyof typeof defaultSettings];
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'boolean') return value !== false;
      return value !== defaultValue;
    });
  }, [settings]);

  return (
    <>
      {!hideTrigger && (
        customTrigger ? (
          typeof customTrigger === 'function'
            ? customTrigger({ isOpen, toggle: () => setIsOpen(!isOpen), hasActiveSettings, ref: buttonRef })
            : customTrigger
        ) : (
          <TriggerButton
            ref={buttonRef}
            isOpen={isOpen}
            hasActiveSettings={hasActiveSettings}
            label={t('title')}
            onClick={() => setIsOpen(!isOpen)}
          />
        )
      )}

      <Panel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onReset={resetSettings}
        title={t('title')}
        subtitle={t('subtitle')}
        resetLabel={t('reset')}
        closeLabel={t('close')}
        footerText={t('settingsSaved')}
        buttonRef={buttonRef}
        position={position}
      >
        <Accordion defaultOpen={['settings']} allowMultiple={false}>
          {/* Profiles Section */}
          <AccordionItem
            id="profiles"
            title={
              <div className="flex w-full items-center gap-2">
                <Icons.accessibility className="h-5 w-5" />
                <span>{t('profiles')}</span>
                {settings.activeProfile && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
            }
          >
            <ProfilesSection
              activeProfile={settings.activeProfile}
              onSelectProfile={applyProfile}
              t={t}
            />
          </AccordionItem>

          {/* All Settings */}
          <AccordionItem
            id="settings"
            title={
              <div className="flex w-full items-center gap-2">
                <Icons.fontSize className="h-5 w-5" />
                <span>{t('settings')}</span>
              </div>
            }
          >
            <SettingsSection
              settings={settings}
              updateSetting={updateSetting}
              t={t}
              getOptions={getOptions}
            />
          </AccordionItem>
        </Accordion>
      </Panel>
    </>
  );
};
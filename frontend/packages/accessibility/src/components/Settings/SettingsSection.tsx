import React from 'react';

import { MultiLevelCard } from './MultiLevelCard';
import { ToggleCard } from './ToggleCard';
import { Icons } from '../Icons';

import type { AccessibilitySettings, TranslationKey } from '../../types';

interface SettingsSectionProps {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  t: (key: TranslationKey) => string;
  getOptions: (key: TranslationKey) => string[];
}

/**
 * Section containing all accessibility settings
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  updateSetting,
  t,
  getOptions,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Multi-level Settings */}
      <MultiLevelCard
        description={t('fontSizeDesc')}
        icon={<Icons.fontSize />}
        label={t('fontSize')}
        maxLevel={3}
        options={getOptions('fontSizeOptions')}
        value={settings.fontSize}
        onChange={(v) => updateSetting('fontSize', v)}
      />

      <MultiLevelCard
        description={t('contrastDesc')}
        icon={<Icons.contrast />}
        label={t('contrast')}
        maxLevel={2}
        options={getOptions('contrastOptions')}
        value={settings.contrast}
        onChange={(v) => updateSetting('contrast', v)}
      />

      <MultiLevelCard
        description={t('saturationDesc')}
        icon={<Icons.saturation />}
        label={t('saturation')}
        maxLevel={2}
        options={getOptions('saturationOptions')}
        value={settings.saturation}
        onChange={(v) => updateSetting('saturation', v)}
      />

      <MultiLevelCard
        description={t('lineHeightDesc')}
        icon={<Icons.lineHeight />}
        label={t('lineHeight')}
        maxLevel={2}
        options={getOptions('lineHeightOptions')}
        value={settings.lineHeight}
        onChange={(v) => updateSetting('lineHeight', v)}
      />

      <MultiLevelCard
        description={t('letterSpacingDesc')}
        icon={<Icons.letterSpacing />}
        label={t('letterSpacing')}
        maxLevel={2}
        options={getOptions('letterSpacingOptions')}
        value={settings.letterSpacing}
        onChange={(v) => updateSetting('letterSpacing', v)}
      />

      <MultiLevelCard
        description={t('wordSpacingDesc')}
        icon={<Icons.wordSpacing />}
        label={t('wordSpacing')}
        maxLevel={2}
        options={getOptions('wordSpacingOptions')}
        value={settings.wordSpacing}
        onChange={(v) => updateSetting('wordSpacing', v)}
      />

      <MultiLevelCard
        description={t('textAlignDesc')}
        icon={<Icons.textAlign />}
        label={t('textAlign')}
        maxLevel={2}
        options={getOptions('textAlignOptions')}
        value={settings.textAlign}
        onChange={(v) => updateSetting('textAlign', v)}
      />

      <MultiLevelCard
        description={t('cursorSizeDesc')}
        icon={<Icons.cursorSize />}
        label={t('cursorSize')}
        maxLevel={2}
        options={getOptions('cursorSizeOptions')}
        value={settings.cursorSize}
        onChange={(v) => updateSetting('cursorSize', v)}
      />

      {/* Toggle Settings */}
      <ToggleCard
        active={settings.dyslexicFont}
        description={t('dyslexicFontDesc')}
        icon={<Icons.dyslexicFont />}
        label={t('dyslexicFont')}
        onChange={() => updateSetting('dyslexicFont', !settings.dyslexicFont)}
      />

      <ToggleCard
        active={settings.reducedMotion}
        description={t('reducedMotionDesc')}
        icon={<Icons.reducedMotion />}
        label={t('reducedMotion')}
        onChange={() => updateSetting('reducedMotion', !settings.reducedMotion)}
      />

      <ToggleCard
        active={settings.highlightLinks}
        description={t('highlightLinksDesc')}
        icon={<Icons.highlightLinks />}
        label={t('highlightLinks')}
        onChange={() => updateSetting('highlightLinks', !settings.highlightLinks)}
      />

      <ToggleCard
        active={settings.highlightHeadings}
        description={t('highlightHeadingsDesc')}
        icon={<Icons.highlightHeadings />}
        label={t('highlightHeadings')}
        onChange={() => updateSetting('highlightHeadings', !settings.highlightHeadings)}
      />

      <ToggleCard
        active={settings.focusIndicator}
        description={t('focusIndicatorDesc')}
        icon={<Icons.focusIndicator />}
        label={t('focusIndicator')}
        onChange={() => updateSetting('focusIndicator', !settings.focusIndicator)}
      />

      <ToggleCard
        active={settings.hideImages}
        description={t('hideImagesDesc')}
        icon={<Icons.hideImages />}
        label={t('hideImages')}
        onChange={() => updateSetting('hideImages', !settings.hideImages)}
      />

      <ToggleCard
        active={settings.readingGuide}
        description={t('readingGuideDesc')}
        icon={<Icons.readingGuide />}
        label={t('readingGuide')}
        onChange={() => updateSetting('readingGuide', !settings.readingGuide)}
      />

      <ToggleCard
        active={settings.readingMask}
        description={t('readingMaskDesc')}
        icon={<Icons.readingMask />}
        label={t('readingMask')}
        onChange={() => updateSetting('readingMask', !settings.readingMask)}
      />
    </div>
  );
};
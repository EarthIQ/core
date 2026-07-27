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
        icon={<Icons.fontSize />}
        label={t('fontSize')}
        description={t('fontSizeDesc')}
        value={settings.fontSize}
        maxLevel={3}
        options={getOptions('fontSizeOptions')}
        onChange={(v) => updateSetting('fontSize', v)}
      />

      <MultiLevelCard
        icon={<Icons.contrast />}
        label={t('contrast')}
        description={t('contrastDesc')}
        value={settings.contrast}
        maxLevel={2}
        options={getOptions('contrastOptions')}
        onChange={(v) => updateSetting('contrast', v)}
      />

      <MultiLevelCard
        icon={<Icons.saturation />}
        label={t('saturation')}
        description={t('saturationDesc')}
        value={settings.saturation}
        maxLevel={2}
        options={getOptions('saturationOptions')}
        onChange={(v) => updateSetting('saturation', v)}
      />

      <MultiLevelCard
        icon={<Icons.lineHeight />}
        label={t('lineHeight')}
        description={t('lineHeightDesc')}
        value={settings.lineHeight}
        maxLevel={2}
        options={getOptions('lineHeightOptions')}
        onChange={(v) => updateSetting('lineHeight', v)}
      />

      <MultiLevelCard
        icon={<Icons.letterSpacing />}
        label={t('letterSpacing')}
        description={t('letterSpacingDesc')}
        value={settings.letterSpacing}
        maxLevel={2}
        options={getOptions('letterSpacingOptions')}
        onChange={(v) => updateSetting('letterSpacing', v)}
      />

      <MultiLevelCard
        icon={<Icons.wordSpacing />}
        label={t('wordSpacing')}
        description={t('wordSpacingDesc')}
        value={settings.wordSpacing}
        maxLevel={2}
        options={getOptions('wordSpacingOptions')}
        onChange={(v) => updateSetting('wordSpacing', v)}
      />

      <MultiLevelCard
        icon={<Icons.textAlign />}
        label={t('textAlign')}
        description={t('textAlignDesc')}
        value={settings.textAlign}
        maxLevel={2}
        options={getOptions('textAlignOptions')}
        onChange={(v) => updateSetting('textAlign', v)}
      />

      <MultiLevelCard
        icon={<Icons.cursorSize />}
        label={t('cursorSize')}
        description={t('cursorSizeDesc')}
        value={settings.cursorSize}
        maxLevel={2}
        options={getOptions('cursorSizeOptions')}
        onChange={(v) => updateSetting('cursorSize', v)}
      />

      {/* Toggle Settings */}
      <ToggleCard
        icon={<Icons.dyslexicFont />}
        label={t('dyslexicFont')}
        description={t('dyslexicFontDesc')}
        active={settings.dyslexicFont}
        onChange={() => updateSetting('dyslexicFont', !settings.dyslexicFont)}
      />

      <ToggleCard
        icon={<Icons.reducedMotion />}
        label={t('reducedMotion')}
        description={t('reducedMotionDesc')}
        active={settings.reducedMotion}
        onChange={() => updateSetting('reducedMotion', !settings.reducedMotion)}
      />

      <ToggleCard
        icon={<Icons.highlightLinks />}
        label={t('highlightLinks')}
        description={t('highlightLinksDesc')}
        active={settings.highlightLinks}
        onChange={() => updateSetting('highlightLinks', !settings.highlightLinks)}
      />

      <ToggleCard
        icon={<Icons.highlightHeadings />}
        label={t('highlightHeadings')}
        description={t('highlightHeadingsDesc')}
        active={settings.highlightHeadings}
        onChange={() => updateSetting('highlightHeadings', !settings.highlightHeadings)}
      />

      <ToggleCard
        icon={<Icons.focusIndicator />}
        label={t('focusIndicator')}
        description={t('focusIndicatorDesc')}
        active={settings.focusIndicator}
        onChange={() => updateSetting('focusIndicator', !settings.focusIndicator)}
      />

      <ToggleCard
        icon={<Icons.hideImages />}
        label={t('hideImages')}
        description={t('hideImagesDesc')}
        active={settings.hideImages}
        onChange={() => updateSetting('hideImages', !settings.hideImages)}
      />

      <ToggleCard
        icon={<Icons.readingGuide />}
        label={t('readingGuide')}
        description={t('readingGuideDesc')}
        active={settings.readingGuide}
        onChange={() => updateSetting('readingGuide', !settings.readingGuide)}
      />

      <ToggleCard
        icon={<Icons.readingMask />}
        label={t('readingMask')}
        description={t('readingMaskDesc')}
        active={settings.readingMask}
        onChange={() => updateSetting('readingMask', !settings.readingMask)}
      />
    </div>
  );
};
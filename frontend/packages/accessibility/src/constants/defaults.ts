import type { AccessibilitySettings } from '../types';

/**
 * Default accessibility settings
 * All features are disabled/set to normal by default
 */
export const defaultSettings: AccessibilitySettings = {
  fontSize: 0,
  contrast: 0,
  saturation: 0,
  reducedMotion: false,
  dyslexicFont: false,
  highlightLinks: false,
  highlightHeadings: false,
  lineHeight: 0,
  letterSpacing: 0,
  wordSpacing: 0,
  cursorSize: 0,
  focusIndicator: false,
  hideImages: false,
  textAlign: 0,
  readingGuide: false,
  readingMask: false,
  biggerText: false,
  tooltips: false,
  activeProfile: null,
};
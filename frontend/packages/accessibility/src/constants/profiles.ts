import type { Profile } from '../types';

/**
 * Predefined accessibility profiles
 * Each profile applies a set of settings optimized for specific needs
 */
export const profiles: Profile[] = [
  {
    id: 'low-vision',
    nameKey: 'profileLowVision',
    descKey: 'profileLowVisionDesc',
    icon: '👁️',
    color: 'from-blue-500 to-blue-600',
    settings: {
      fontSize: 2,
      contrast: 1,
      focusIndicator: true,
      cursorSize: 1,
      lineHeight: 1,
    },
  },
  {
    id: 'blind',
    nameKey: 'profileBlind',
    descKey: 'profileBlindDesc',
    icon: '🦯',
    color: 'from-purple-500 to-purple-600',
    settings: {
      reducedMotion: true,
      focusIndicator: true,
      hideImages: true,
    },
  },
  {
    id: 'dyslexia',
    nameKey: 'profileDyslexia',
    descKey: 'profileDyslexiaDesc',
    icon: '📖',
    color: 'from-teal-500 to-teal-600',
    settings: {
      dyslexicFont: true,
      lineHeight: 2,
      letterSpacing: 1,
      wordSpacing: 1,
      fontSize: 1,
    },
  },
  {
    id: 'color-blind',
    nameKey: 'profileColorBlind',
    descKey: 'profileColorBlindDesc',
    icon: '🎨',
    color: 'from-orange-500 to-orange-600',
    settings: {
      saturation: 2,
      contrast: 1,
      highlightLinks: true,
    },
  },
  {
    id: 'motor',
    nameKey: 'profileMotor',
    descKey: 'profileMotorDesc',
    icon: '🖐️',
    color: 'from-green-500 to-green-600',
    settings: {
      cursorSize: 2,
      focusIndicator: true,
      reducedMotion: true,
    },
  },
  {
    id: 'adhd',
    nameKey: 'profileADHD',
    descKey: 'profileADHDDesc',
    icon: '🧠',
    color: 'from-pink-500 to-pink-600',
    settings: {
      reducedMotion: true,
      hideImages: true,
      readingMask: true,
      saturation: 1,
    },
  },
  {
    id: 'cognitive',
    nameKey: 'profileCognitive',
    descKey: 'profileCognitiveDesc',
    icon: '💡',
    color: 'from-yellow-500 to-yellow-600',
    settings: {
      fontSize: 1,
      lineHeight: 1,
      highlightHeadings: true,
      highlightLinks: true,
      reducedMotion: true,
      tooltips: true,
    },
  },
];
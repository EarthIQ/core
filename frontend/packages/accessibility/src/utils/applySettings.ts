import type { AccessibilitySettings } from '../types';

/**
 * Apply accessibility settings to the DOM
 * This function adds/removes CSS classes and inline styles
 */
export function applySettingsToDOM(settings: AccessibilitySettings): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;

  // Font size
  const fontSizes = ['100%', '112.5%', '125%', '150%'];
  html.style.fontSize = fontSizes[settings.fontSize] || '100%';

  // Contrast
  html.classList.remove('a11y-high-contrast', 'a11y-inverted');
  if (settings.contrast === 1) html.classList.add('a11y-high-contrast');
  if (settings.contrast === 2) html.classList.add('a11y-inverted');

  // Saturation
  html.classList.remove('a11y-low-saturation', 'a11y-grayscale');
  if (settings.saturation === 1) html.classList.add('a11y-low-saturation');
  if (settings.saturation === 2) html.classList.add('a11y-grayscale');

  // Reduced motion
  html.classList.toggle('a11y-reduced-motion', settings.reducedMotion);

  // Dyslexic font
  html.classList.toggle('a11y-dyslexic-font', settings.dyslexicFont);

  // Highlight links
  html.classList.toggle('a11y-highlight-links', settings.highlightLinks);

  // Highlight headings
  html.classList.toggle('a11y-highlight-headings', settings.highlightHeadings);

  // Line height
  const lineHeights = ['normal', '1.8', '2.2'];
  body.style.lineHeight = lineHeights[settings.lineHeight] || 'normal';

  // Letter spacing
  const letterSpacings = ['normal', '0.05em', '0.1em'];
  body.style.letterSpacing = letterSpacings[settings.letterSpacing] || 'normal';

  // Word spacing
  const wordSpacings = ['normal', '0.1em', '0.2em'];
  body.style.wordSpacing = wordSpacings[settings.wordSpacing] || 'normal';

  // Cursor size
  html.classList.remove('a11y-cursor-large', 'a11y-cursor-larger');
  if (settings.cursorSize === 1) html.classList.add('a11y-cursor-large');
  if (settings.cursorSize === 2) html.classList.add('a11y-cursor-larger');

  // Focus indicator
  html.classList.toggle('a11y-focus-indicator', settings.focusIndicator);

  // Hide images
  html.classList.toggle('a11y-hide-images', settings.hideImages);

  // Text align
  html.classList.remove('a11y-text-left', 'a11y-text-justify');
  if (settings.textAlign === 1) html.classList.add('a11y-text-left');
  if (settings.textAlign === 2) html.classList.add('a11y-text-justify');

  // Reading aids
  html.classList.toggle('a11y-reading-guide', settings.readingGuide);
  html.classList.toggle('a11y-reading-mask', settings.readingMask);

  // Other
  html.classList.toggle('a11y-bigger-text', settings.biggerText);
  html.classList.toggle('a11y-tooltips', settings.tooltips);
}
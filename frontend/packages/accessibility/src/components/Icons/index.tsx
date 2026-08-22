import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Icon components used throughout the accessibility widget
 */
export const Icons = {
  accessibility: ({ className = "h-6 w-6", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6v14" />
      <path d="M8 8h8" />
      <path d="M8 12l-2 8" />
      <path d="M16 12l2 8" />
    </svg>
  ),

  close: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),

  reset: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),

  check: ({ className = "h-4 w-4", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),

  chevronDown: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),

  fontSize: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),

  contrast: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
    </svg>
  ),

  saturation: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),

  lineHeight: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M21 10H3M21 6H3M21 14H3M21 18H3" />
    </svg>
  ),

  letterSpacing: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M7 8h10M5 12h14M7 16h10M3 8v8M21 8v8" />
    </svg>
  ),

  wordSpacing: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M8 6h8M4 12h16M8 18h8" />
    </svg>
  ),

  textAlign: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M21 6H3M15 12H3M17 18H3" />
    </svg>
  ),

  cursorSize: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3zM13 13l6 6" />
    </svg>
  ),

  dyslexicFont: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6M9 11h6" />
    </svg>
  ),

  reducedMotion: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),

  highlightLinks: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),

  highlightHeadings: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M4 12h16M4 6v12M20 6v12" />
    </svg>
  ),

  focusIndicator: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  ),

  hideImages: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),

  readingGuide: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <path d="M2 12h20M12 2v20" />
    </svg>
  ),

  readingMask: ({ className = "h-5 w-5", size }: IconProps = {}) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width={size}
      height={size}
    >
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 17v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
};

// Type for icon names
export type IconName = keyof typeof Icons;

// Type for the icon component
export type IconComponent = (props?: IconProps) => React.ReactElement;

// Export IconProps for external use
export type { IconProps };

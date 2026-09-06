import { useId } from "react";
import { cn } from "@packages/ui";

/**
 * Brand cyan used for the "IQ" accent - kept in sync with the SVG assets in
 * `public/` (favicon.svg / logo.svg) and the node palette of the mark.
 */
const BRAND_IQ = "#22D3EE";

interface LogoMarkProps {
  /** Pixel size of the square mark (width & height). */
  size?: number;
  className?: string;
  /** Accessible label. Omit to render as a decorative (aria-hidden) glyph. */
  title?: string;
}

/**
 * EarthIQ brand mark - a globe overlaid with a small neural-network "IQ" core.
 *
 * Self-contained inline SVG (no network request) so it renders identically in
 * the sidebar, header, and any other in-app surface. Gradient / filter IDs are
 * namespaced per instance via `useId` so multiple marks can coexist on a page
 * without `<defs>` collisions.
 */
export function LogoMark({ size = 32, className, title }: LogoMarkProps) {
  const rawId = useId();
  const id = (suffix: string) => `${rawId}-${suffix}`;
  const url = (suffix: string) => `url(#${id(suffix)})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <radialGradient id={id("bg")} cx="50%" cy="36%" r="78%">
          <stop offset="0%" stopColor="#13253D" />
          <stop offset="100%" stopColor="#070D18" />
        </radialGradient>
        <linearGradient id={id("globe")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A3A5E" />
          <stop offset="100%" stopColor="#0B1A2E" />
        </linearGradient>
        <filter id={id("glow")} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* App-icon background */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={url("bg")} stroke="#1E3350" strokeWidth="1" />
      <circle cx="32" cy="32" r="25" fill="none" stroke="#0891B2" strokeWidth="1.4" strokeDasharray="3 4.5" opacity="0.45" />

      {/* Globe */}
      <circle cx="32" cy="32" r="18" fill={url("globe")} stroke="#3E6394" strokeWidth="2" />
      <g fill="none" stroke="#6E95CB" opacity="0.55">
        <ellipse cx="32" cy="32" rx="18" ry="7" strokeWidth="1.3" />
        <ellipse cx="32" cy="32" rx="8" ry="18" strokeWidth="1.3" />
      </g>

      {/* Neural "IQ" core */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" strokeWidth="1.8" opacity="0.95">
          <path d="M21 25 L32 31 L43 25" stroke="#0891B2" />
          <path d="M24 41 L32 31 L40 41" stroke="#059669" />
        </g>
        <g filter={url("glow")}>
          <circle cx="21" cy="25" r="2.7" fill="#38BDF8" />
          <circle cx="43" cy="25" r="2.7" fill="#34D399" />
          <circle cx="24" cy="41" r="2.7" fill="#34D399" />
          <circle cx="40" cy="41" r="2.7" fill="#38BDF8" />
          <circle cx="32" cy="31" r="3.6" fill="#7DD3FC" />
        </g>
        <circle cx="32" cy="31" r="1.5" fill="#F0F9FF" />
      </g>
    </svg>
  );
}

interface LogoProps {
  /** Size of the square mark. */
  size?: number;
  /** Show the "EarthIQ" wordmark next to the mark. */
  withWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

/**
 * Full EarthIQ lockup (mark + wordmark). The wordmark is native HTML text so
 * it inherits the app's web fonts and theme tokens.
 */
export function Logo({
  size = 28,
  withWordmark = true,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span
          className={cn(
            "tracking-tight whitespace-nowrap font-medium",
            wordmarkClassName,
          )}
        >
          <span className="text-text-primary font-medium">Earth</span>
          <span className="font-extrabold" style={{ color: BRAND_IQ }}>
            IQ
          </span>
        </span>
      )}
    </span>
  );
}

export default Logo;

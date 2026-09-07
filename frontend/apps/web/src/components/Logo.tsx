import { cn } from "@packages/ui";
import { useId } from "react";

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
export const LogoMark = ({ size = 32, className, title }: LogoMarkProps) => {
  const rawId = useId();
  const id = (suffix: string) => `${rawId}-${suffix}`;
  const url = (suffix: string) => `url(#${id(suffix)})`;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("shrink-0", className)}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient cx="50%" cy="36%" id={id("bg")} r="78%">
          <stop offset="0%" stopColor="#13253D" />
          <stop offset="100%" stopColor="#070D18" />
        </radialGradient>
        <linearGradient id={id("globe")} x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#1A3A5E" />
          <stop offset="100%" stopColor="#0B1A2E" />
        </linearGradient>
        <filter height="240%" id={id("glow")} width="240%" x="-70%" y="-70%">
          <feGaussianBlur result="b" stdDeviation="2.4" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* App-icon background */}
      <rect fill={url("bg")} height="60" rx="16" stroke="#1E3350" strokeWidth="1" width="60" x="2" y="2" />
      <circle cx="32" cy="32" fill="none" opacity="0.45" r="25" stroke="#0891B2" strokeDasharray="3 4.5" strokeWidth="1.4" />

      {/* Globe */}
      <circle cx="32" cy="32" fill={url("globe")} r="18" stroke="#3E6394" strokeWidth="2" />
      <g fill="none" opacity="0.55" stroke="#6E95CB">
        <ellipse cx="32" cy="32" rx="18" ry="7" strokeWidth="1.3" />
        <ellipse cx="32" cy="32" rx="8" ry="18" strokeWidth="1.3" />
      </g>

      {/* Neural "IQ" core */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <g fill="none" opacity="0.95" strokeWidth="1.8">
          <path d="M21 25 L32 31 L43 25" stroke="#0891B2" />
          <path d="M24 41 L32 31 L40 41" stroke="#059669" />
        </g>
        <g filter={url("glow")}>
          <circle cx="21" cy="25" fill="#38BDF8" r="2.7" />
          <circle cx="43" cy="25" fill="#34D399" r="2.7" />
          <circle cx="24" cy="41" fill="#34D399" r="2.7" />
          <circle cx="40" cy="41" fill="#38BDF8" r="2.7" />
          <circle cx="32" cy="31" fill="#7DD3FC" r="3.6" />
        </g>
        <circle cx="32" cy="31" fill="#F0F9FF" r="1.5" />
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
export const Logo = ({
  size = 28,
  withWordmark = true,
  className,
  wordmarkClassName,
}: LogoProps) => {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {withWordmark ? <span
          className={cn(
            "tracking-tight whitespace-nowrap font-medium",
            wordmarkClassName,
          )}
        >
          <span className="text-text-primary font-medium">Earth</span>
          <span className="font-extrabold" style={{ color: BRAND_IQ }}>
            IQ
          </span>
        </span> : null}
    </span>
  );
}

export default Logo;

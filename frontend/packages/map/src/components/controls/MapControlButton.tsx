import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@packages/ui";

// ─── Control Group Container ──────────────────────────────────────────
//
// A floating panel that anchors to the left or right edge of a
// map (or any position-relative ancestor). It stacks its children
// vertically and provides a translucent, blurred backdrop with a
// rounded border and drop-shadow — matching the visual language of
// common map-control toolbars (zoom, compass, layer pickers, etc.).
//
// Usage:
//   <ControlGroup position="right" className="top-4">
//     <ControlButton icon={<PlusIcon />} label="Zoom in" onClick={zoomIn} />
//     <ControlDivider />
//     <ControlButton icon={<MinusIcon />} label="Zoom out" onClick={zoomOut} />
//   </ControlGroup>
// ───────────────────────────────────────────────────────────────────────

interface ControlGroupProps {
  /**
   * Determines which horizontal edge of the parent container the
   * control group is pinned to.
   *
   * - `"left"`  → applies `left-3`  (12 px inset from the left edge)
   * - `"right"` → applies `right-3` (12 px inset from the right edge)
   *
   * Vertical positioning (e.g. `top-4`, `bottom-4`) should be supplied
   * through the `className` prop so the consumer retains full control
   * over the vertical placement.
   */
  position: "left" | "right";

  /**
   * Optional extra Tailwind utility classes merged via `cn()`.
   * Commonly used to set the vertical offset (`top-4`, `bottom-4`)
   * or to override the default width / gap / padding.
   */
  className?: string;

  /**
   * Optional ID for the container element, useful for onboarding or testing.
   */
  id?: string;

  /**
   * One or more `<ControlButton>` and/or `<ControlDivider>` elements
   * (or any arbitrary React nodes) that will be laid out in a vertical
   * stack inside the group container.
   */
  children: ReactNode;
}

export function ControlGroup({
  position,
  className,
  id,
  children,
}: ControlGroupProps) {
  return (
    <div
      id={id}
      className={cn(
        // ── Positioning ──────────────────────────────────────────
        // Absolutely positioned relative to the nearest positioned
        // ancestor. Sits above most map content but below modals /
        // dialogs thanks to the dropdown z-index token.
        "absolute z-[var(--z-dropdown)] flex flex-col",

        // ── Shape & clipping ─────────────────────────────────────
        // Rounded corners with hidden overflow so child buttons
        // don't bleed outside the border radius.
        "rounded-xl",

        // ── Surface treatment ────────────────────────────────────
        // Semi-transparent surface with a frosted-glass blur so the
        // underlying map remains partially visible.
        "bg-[var(--surface)] backdrop-blur-lg",

        // ── Horizontal anchor ────────────────────────────────────
        position === "left" && "left-3",
        position === "right" && "right-3",

        // ── Consumer overrides ───────────────────────────────────
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Control Button ───────────────────────────────────────────────────
//
// A single square (36 × 36 px) icon button designed to live inside a
// `<ControlGroup>`. It communicates its purpose exclusively through an
// `aria-label` and a native `title` tooltip derived from the `label`
// prop, keeping the UI compact while remaining accessible.
//
// The button supports three visual states in addition to its resting
// appearance:
//
//   • **Hover**    – lighter background tint + primary text colour.
//   • **Active**   – a tinted primary background that persists to
//                    indicate the control is "on" (e.g. a toggled
//                    layer or an enabled measurement tool).
//   • **Disabled** – reduced opacity and no pointer events.
// ───────────────────────────────────────────────────────────────────────

interface ControlButtonProps {
  /**
   * A React node rendered at the centre of the button — typically a
   * 16–20 px SVG icon component.
   */
  icon: ReactNode;

  /**
   * Human-readable name for the action. Used as both the native
   * `title` attribute (visible on hover as a browser tooltip) and
   * the `aria-label` for screen-reader accessibility.
   */
  label: string;

  /**
   * When `true` the button renders with a persistent tinted primary
   * background to indicate the associated feature is currently
   * engaged (e.g. a toggled layer visibility or an active drawing
   * tool). Defaults to `false`.
   */
  active?: boolean;

  /**
   * When `true` the button is visually dimmed and cannot be
   * interacted with. Pointer events are suppressed and the opacity
   * is reduced to 40 %. Defaults to `false`.
   */
  disabled?: boolean | undefined;

  /**
   * Click handler invoked when the button is pressed and not
   * disabled. Omit to render a purely decorative / status-only
   * button (rare but possible).
   */
  onClick?: () => void;

  /**
   * Optional extra Tailwind utility classes merged via `cn()`.
   * Useful for one-off tweaks like additional padding or a custom
   * border on a specific button.
   */
  className?: string | undefined;

  /**
   * Optional ID for the button element, useful for onboarding or testing.
   */
  id?: string;
}

export function ControlButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  className,
  id,
}: ControlButtonProps) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        // ── Layout ───────────────────────────────────────────────
        // Centred flex container sized to a fixed 36 × 36 px tap
        // target — large enough for comfortable touch interaction
        // while remaining compact in a vertical stack.
        "flex items-center justify-center",
        "h-9 w-10",

        // ── Transitions ──────────────────────────────────────────
        // Smooth colour changes using the design-system's "fast"
        // duration token for a snappy, responsive feel.
        "transition-colors duration-[var(--transition-fast)]",

        // ── Default (resting) colours ────────────────────────────
        // Secondary text colour ensures the icons are visible but
        // unobtrusive when not hovered or active.
        "text-[var(--text-secondary)]",

        // ── Hover state ──────────────────────────────────────────
        // A light surface tint and promotion to primary text colour
        // provides clear interactive feedback.
        "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",

        // ── Disabled state ───────────────────────────────────────
        // Pointer events are removed and the button is dimmed to
        // clearly communicate that the action is unavailable.
        "disabled:pointer-events-none disabled:opacity-40",

        // ── Active / toggled state ───────────────────────────────
        // A translucent primary tint and matching text colour
        // indicate that the associated feature is currently enabled.
        // The hover overlay is slightly stronger so the button
        // still responds visually to pointer interaction.
        active && [
          "bg-[var(--primary)]/10 text-[var(--primary)]",
          "hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]",
        ],

        // ── Consumer overrides ───────────────────────────────────
        className
      )}
    >
      {icon}
    </button>
  );
}

// ─── Control Divider ──────────────────────────────────────────────────
//
// A thin horizontal rule used to visually separate groups of related
// `<ControlButton>` elements within a `<ControlGroup>`.
//
// The divider is a 1 px tall line that spans the width of the group
// minus 8 px of horizontal margin (`mx-2`), preventing it from
// touching the rounded edges of the container. It uses the primary
// border colour token to stay consistent with the group's own border.
//
// Because it carries no semantic meaning it is rendered as a plain
// `<div>` rather than an `<hr>`, keeping the markup minimal.
// ───────────────────────────────────────────────────────────────────────

export function ControlDivider() {
  return <hr className="mx-2 h-px bg-[var(--border-primary)]" />;
}

// ─── Flyout Context ──────────────────────────────────────────────────
// Allows any descendant to close the flyout programmatically.

interface FlyoutContextValue {
  close: () => void;
  isOpen: boolean;
}

const FlyoutContext = createContext<FlyoutContextValue>({
  close: () => {},
  isOpen: false,
});

export const useFlyoutContext = () => useContext(FlyoutContext);

// ─── Control Button Flyout ────────────────────────────────────────────
//
// A ControlButton that, when clicked, opens a flyout panel built from
// a real <ControlGroup>. The flyout reuses the exact same visual
// treatment (rounded corners, blur, border, shadow) as the primary
// toolbar — keeping the design language perfectly consistent.
//
// The flyout panel is positioned absolutely relative to the trigger
// button and supports both horizontal side placement and vertical
// alignment.
//
// Usage:
//   <ControlButtonFlyout
//     icon={<Palette className="h-4 w-4" />}
//     label="Basemap"
//     flyoutSide="right"
//     flyoutAlign="start"
//   >
//     <ControlButton icon={<Map />}       label="Streets"   onClick={…} />
//     <ControlButton icon={<Satellite />} label="Satellite" onClick={…} active />
//     <ControlDivider />
//     <ControlButton icon={<Mountain />}  label="Terrain"   onClick={…} />
//   </ControlButtonFlyout>
//
// The children are rendered inside a <ControlGroup> — so you use the
// same <ControlButton>, <ControlDivider>, and even nested
// <ControlButtonFlyout> components you already know.
// ───────────────────────────────────────────────────────────────────────

type FlyoutSide = "left" | "right";
type FlyoutAlign = "start" | "center" | "end" | "auto";

interface ControlButtonFlyoutProps {
  /** Icon rendered in the trigger button. */
  icon: ReactNode;
  /** Accessible label for the trigger button. */
  label: string;
  /**
   * Which horizontal side the flyout appears on.
   * @default "right"
   */
  flyoutSide?: FlyoutSide;
  /**
   * Vertical alignment of the flyout relative to the trigger.
   *
   * - `"start"`  — top edges align
   * - `"center"` — vertical centres align
   * - `"end"`    — bottom edges align
   * - `"auto"`   — measures viewport space and picks the best
   *
   * @default "auto"
   */
  flyoutAlign?: FlyoutAlign;
  /**
   * Pixel gap between the trigger button edge and the flyout.
   * @default 8
   */
  flyoutGap?: number;
  /** Persistent active styling on the trigger (independent of open). */
  active?: boolean;
  /** Force the flyout to remain open override. */
  forceOpen?: boolean;
  /** Disable the trigger button. */
  disabled?: boolean;
  /** Extra classes for the trigger button. */
  className?: string | undefined;
  /** Extra classes for the flyout ControlGroup. */
  flyoutClassName?: string | undefined;
  /**
   * Content rendered inside the flyout ControlGroup.
   * Use <ControlButton>, <ControlDivider>, etc.
   */
  children: ReactNode;
}

export function ControlButtonFlyout({
  icon,
  label,
  flyoutSide = "right",
  flyoutAlign = "auto",
  flyoutGap = 8,
  active = false,
  forceOpen = false,
  disabled = false,
  className,
  flyoutClassName,
  children,
}: ControlButtonFlyoutProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = forceOpen || internalOpen;

  const [resolvedAlign, setResolvedAlign] = useState<
    "start" | "center" | "end"
  >("start");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // ── Resolve "auto" alignment based on viewport space ──────
  const computeAlignment = useCallback(() => {
    if (flyoutAlign !== "auto") {
      setResolvedAlign(flyoutAlign);
      return;
    }

    const wrapper = wrapperRef.current;
    const flyout = flyoutRef.current;
    if (!wrapper || !flyout) {
      setResolvedAlign("start");
      return;
    }

    const triggerRect = wrapper.getBoundingClientRect();
    const flyoutHeight = flyout.scrollHeight;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.top;
    const spaceAbove = triggerRect.bottom;

    if (spaceBelow >= flyoutHeight) {
      setResolvedAlign("start");
    } else if (spaceAbove >= flyoutHeight) {
      setResolvedAlign("end");
    } else {
      // Center if neither side fits fully
      const centerSpace =
        Math.min(
          triggerRect.top + triggerRect.height / 2,
          viewportHeight - (triggerRect.top + triggerRect.height / 2)
        ) * 2;

      if (centerSpace >= flyoutHeight) {
        setResolvedAlign("center");
      } else {
        setResolvedAlign(spaceBelow >= spaceAbove ? "start" : "end");
      }
    }
  }, [flyoutAlign]);

  // Recalculate on open and window resize
  useEffect(() => {
    if (!open) return;

    // Run on next frame so the flyout is rendered and measurable
    const raf = requestAnimationFrame(computeAlignment);

    window.addEventListener("resize", computeAlignment);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", computeAlignment);
    };
  }, [open, computeAlignment]);

  // ── Close on outside click or Escape ──────────────────────
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setInternalOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInternalOpen(false);
    };

    // Use a microtask delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // ── Flyout context value ──────────────────────────────────
  const contextValue: FlyoutContextValue = {
    close: () => setInternalOpen(false),
    isOpen: open,
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      {/* ── Trigger ──────────────────────────────────────────── */}
      <ControlButton
        icon={icon}
        label={label}
        active={active || open}
        disabled={disabled}
        onClick={() => setInternalOpen((prev) => !prev)}
        className={className}
      />

      {/* ── Flyout panel (a real ControlGroup) ───────────────── */}
      <div
        ref={flyoutRef}
        style={
          flyoutSide === "right"
            ? { left: `calc(100% + ${flyoutGap}px)` }
            : { right: `calc(100% + ${flyoutGap}px)` }
        }
        className={cn(
          "absolute z-[var(--z-dropdown)]",

          // ── Horizontal positioning ──────────────────────────
          flyoutSide === "right" && "left-full",
          flyoutSide === "left" && "right-full",

          // ── Vertical alignment ──────────────────────────────
          resolvedAlign === "start" && "top-0",
          resolvedAlign === "center" && "top-1/2 -translate-y-1/2",
          resolvedAlign === "end" && "bottom-0",

          // ── Enter / exit animation ──────────────────────────
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          flyoutSide === "right" && "origin-left",
          flyoutSide === "left" && "origin-right",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {/*
          We render a ControlGroup with position overridden to remove
          the absolute left/right positioning (since the outer wrapper
          already handles placement). We use "left" as a dummy value
          and override the positioning classes.
        */}
        <div
          role="menu"
          aria-label={`${label} options`}
          className={cn(
            // ── Reuse ControlGroup's visual treatment ─────────
            "flex flex-col",
            "rounded-xl",
            "bg-[var(--surface)] backdrop-blur-lg",
            "border border-[var(--border-primary)]",
            "shadow-[var(--shadow-lg)]",
            "min-w-[40px]",
            flyoutClassName
          )}
        >
          <FlyoutContext.Provider value={contextValue}>
            {children}
          </FlyoutContext.Provider>
        </div>
      </div>
    </div>
  );
}

// ─── FlyoutCloseButton ────────────────────────────────────────────────
//
// A convenience wrapper around ControlButton that auto-closes the
// parent flyout when clicked. Use this inside a ControlButtonFlyout
// for actions that should dismiss the panel.
//
// Usage:
//   <ControlButtonFlyout icon={…} label="Tools" flyoutSide="right">
//     <FlyoutCloseButton icon={<Copy />} label="Copy link" onClick={…} />
//   </ControlButtonFlyout>
// ───────────────────────────────────────────────────────────────────────

export interface MapControlButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean | undefined;
  children: React.ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

interface FlyoutCloseButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FlyoutCloseButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
  className,
}: FlyoutCloseButtonProps) {
  const { close } = useFlyoutContext();

  const handleClick = () => {
    onClick?.();
    close();
  };

  return (
    <ControlButton
      icon={icon}
      label={label}
      active={active}
      disabled={disabled}
      onClick={handleClick}
      className={className}
    />
  );
}

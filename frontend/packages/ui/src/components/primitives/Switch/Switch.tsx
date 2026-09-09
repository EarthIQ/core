import { motion } from "framer-motion";
import React, {
  forwardRef,
  useCallback,
  type InputHTMLAttributes,
} from "react";

import { cn } from "../../../utils/cn";

// =========================================
// Types
// =========================================
type SwitchSize = "sm" | "md" | "lg";

interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "onChange"
> {
  label?: string;
  description?: string;
  size?: SwitchSize;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
}

// =========================================
// Constants
// =========================================
const TRACK_SIZES: Record<SwitchSize, string> = {
  sm: "w-8 h-5",
  md: "w-11 h-6",
  lg: "w-14 h-8",
};

const THUMB_SIZES: Record<SwitchSize, string> = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6",
};

const THUMB_OFFSET: Record<SwitchSize, { on: number; off: number }> = {
  sm: { on: 14, off: 4 },
  md: { on: 20, off: 4 },
  lg: { on: 26, off: 4 },
};

const SPRING_CONFIG = { type: "spring", stiffness: 500, damping: 30 } as const;

// =========================================
// Sub-components
// =========================================
interface SwitchTrackProps {
  checked: boolean;
  size: SwitchSize;
  className?: string;
  children: React.ReactNode;
}

const SwitchTrack = ({
  checked,
  size,
  className,
  children,
}: SwitchTrackProps) => (
  <motion.div
    className={cn("rounded-full", TRACK_SIZES[size], className)}
    transition={{ duration: 0.2 }}
    animate={{
      backgroundColor: checked ? "var(--toggle-bg-on)" : "var(--toggle-bg-off)",
    }}
  >
    {children}
  </motion.div>
);

interface SwitchThumbProps {
  checked: boolean;
  size: SwitchSize;
}

const SwitchThumb = ({ checked, size }: SwitchThumbProps) => (
  <motion.div
    animate={{ x: checked ? THUMB_OFFSET[size].on : THUMB_OFFSET[size].off }}
    className={cn("absolute top-1 rounded-full", THUMB_SIZES[size])}
    initial={false}
    transition={SPRING_CONFIG}
    style={{
      backgroundColor: "var(--toggle-knob)",
      boxShadow: "var(--shadow-sm)",
    }}
  />
);

interface SwitchLabelProps {
  label?: string;
  description?: string;
}

const SwitchLabel = ({ label, description }: SwitchLabelProps) => {
  if (!label && !description) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {label ? (
        <span
          className="text-sm leading-none font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
      ) : null}
      {description ? (
        <span
          className="text-xs leading-tight"
          style={{ color: "var(--text-tertiary)" }}
        >
          {description}
        </span>
      ) : null}
    </div>
  );
};

// =========================================
// Main Component
// =========================================
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      size = "md",
      disabled = false,
      checked,
      defaultChecked,
      onChange,
      onCheckedChange,
      id,
      ...props
    },
    ref
  ) => {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newChecked = e.target.checked;
        onChange?.(newChecked);
        onCheckedChange?.(newChecked);
      },
      [onChange, onCheckedChange]
    );

    const isChecked = checked ?? defaultChecked ?? false;
    const switchId =
      id ??
      (label
        ? `switch-${label.toLowerCase().replace(/\s+/g, "-")}`
        : undefined);

    return (
      <label
        htmlFor={switchId}
        className={cn(
          "inline-flex items-center gap-3",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
      >
        {/* Hidden Input */}
        <input
          ref={ref}
          aria-checked={isChecked}
          aria-label={label}
          checked={checked}
          className="sr-only hidden"
          defaultChecked={defaultChecked}
          disabled={disabled}
          id={switchId}
          role="switch"
          type="checkbox"
          onChange={handleChange}
          {...props}
        />

        {/* Visual Track */}
        <div className="relative flex-shrink-0">
          <SwitchTrack
            checked={isChecked}
            className={className ?? ""}
            size={size}
          >
            <SwitchThumb
              checked={isChecked}
              size={size}
            />
          </SwitchTrack>
        </div>

        {/* Label & Description */}
        <SwitchLabel
          description={description ?? ""}
          label={label ?? ""}
        />
      </label>
    );
  }
);

Switch.displayName = "Switch";

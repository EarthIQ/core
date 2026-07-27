import React, {
  forwardRef,
  useCallback,
  type InputHTMLAttributes,
} from "react";
import { motion } from "framer-motion";
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
    animate={{
      backgroundColor: checked ? "var(--toggle-bg-on)" : "var(--toggle-bg-off)",
    }}
    transition={{ duration: 0.2 }}
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
    initial={false}
    animate={{ x: checked ? THUMB_OFFSET[size].on : THUMB_OFFSET[size].off }}
    transition={SPRING_CONFIG}
    className={cn("absolute top-1 rounded-full", THUMB_SIZES[size])}
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
      {label && (
        <span
          className="text-sm leading-none font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
      )}
      {description && (
        <span
          className="text-xs leading-tight"
          style={{ color: "var(--text-tertiary)" }}
        >
          {description}
        </span>
      )}
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
          id={switchId}
          type="checkbox"
          role="switch"
          aria-checked={isChecked}
          aria-label={label}
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={handleChange}
          className="sr-only hidden"
          {...props}
        />

        {/* Visual Track */}
        <div className="relative flex-shrink-0">
          <SwitchTrack
            checked={isChecked}
            size={size}
            className={className ?? ""}
          >
            <SwitchThumb
              checked={isChecked}
              size={size}
            />
          </SwitchTrack>
        </div>

        {/* Label & Description */}
        <SwitchLabel
          label={label ?? ""}
          description={description ?? ""}
        />
      </label>
    );
  }
);

Switch.displayName = "Switch";

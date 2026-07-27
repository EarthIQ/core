import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";
import { Spinner } from "../../feedback/Spinner/Spinner";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        primary: "",
        ghost: "",
        outline: "",
      },
      size: {
        xs: "h-6 w-6 rounded-md",
        sm: "h-8 w-8 rounded-lg",
        md: "h-10 w-10 rounded-xl",
        lg: "h-12 w-12 rounded-xl",
        xl: "h-14 w-14 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: ReactNode;
  label: string;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant, size, icon, label, loading, disabled, ...props },
    ref
  ) => {
    const getVariantStyles = (): React.CSSProperties => {
      switch (variant) {
        case "primary":
          return {
            backgroundColor: "oklch(from var(--primary) l c h / 0.15)",
            border: "1px solid oklch(from var(--primary) l c h / 0.3)",
            color: "var(--primary)",
          };
        case "ghost":
          return {
            backgroundColor: "transparent",
            color: "var(--text-primary)",
          };
        case "outline":
          return {
            backgroundColor: "transparent",
            border: "1px solid var(--border-primary)",
            color: "var(--text-primary)",
          };
        default: // 'default'
          return {
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border-primary)",
            color: "var(--text-primary)",
          };
      }
    };

    const getHoverStyles = (): React.CSSProperties => {
      switch (variant) {
        case "primary":
          return {
            backgroundColor: "oklch(from var(--primary) l c h / 0.25)",
          };
        case "ghost":
          return {
            backgroundColor: "var(--surface-hover)",
          };
        case "outline":
          return {
            backgroundColor: "var(--surface-hover)",
          };
        default:
          return {
            backgroundColor: "var(--surface-hover)",
          };
      }
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(iconButtonVariants({ variant, size }), className)}
        style={getVariantStyles()}
        disabled={disabled || loading}
        aria-label={label}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, getHoverStyles());
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, getVariantStyles());
          }
        }}
        onFocus={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.boxShadow =
              "0 0 0 2px var(--bg-primary), 0 0 0 4px var(--primary)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : icon}
      </motion.button>
    );
  }
);

IconButton.displayName = "IconButton";

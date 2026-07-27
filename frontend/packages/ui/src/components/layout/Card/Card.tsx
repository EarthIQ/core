import React, { type ReactNode, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../../utils/cn";

const cardVariants = cva(
  "border-base shadow-base border backdrop-blur-sm transition-all duration-[var(--transition-normal)] ease-out",
  {
    variants: {
      variant: {
        // Default card surface
        default: "bg-surface",
        // Slightly deeper surface
        dark: "bg-surface-active",
        // Lighter surface for subtle elevation
        light: "bg-surface-hover border-subtle",
        // Subtle primary-tinted surface
        primary: "bg-primary/10 border-primary/30",
        // Gentle surface gradient
        gradient:
          "border-subtle bg-gradient-to-br from-[color:var(--surface-hover)] to-[color:var(--surface)]",
      },
      size: {
        sm: "rounded-lg p-4",
        md: "rounded-xl p-6",
        lg: "rounded-2xl p-8",
      },
      hoverable: {
        // Keep a soft hover using tokens (no glass/glow)
        true: "hover:bg-surface-hover hover:shadow-elevated cursor-pointer hover:-translate-y-0.5",
        false: "",
      },
      glow: {
        none: "",
        // Soft color glows using your palette
        primary: "shadow-[0_0_30px_oklch(from_var(--primary)_l_c_h_/_0.22)]",
        success: "shadow-[0_0_30px_oklch(from_var(--success)_l_c_h_/_0.22)]",
        error: "shadow-[0_0_30px_oklch(from_var(--error)_l_c_h_/_0.22)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      hoverable: false,
      glow: "none",
    },
  }
);

export interface CardProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof cardVariants> {
  animate?: boolean;
}

export function Card({
  className,
  variant,
  size,
  hoverable,
  glow,
  animate = true,
  children,
  ...props
}: CardProps) {
  const Comp = animate ? motion.div : "div";
  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <Comp
      className={cn(
        cardVariants({ variant, size, hoverable, glow }),
        className
      )}
      {...(animationProps as any)}
      {...(props as HTMLMotionProps<"div">)}
    >
      {children}
    </Comp>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base text-xl font-semibold", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-subtle mt-1 text-sm", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-base", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex items-center gap-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

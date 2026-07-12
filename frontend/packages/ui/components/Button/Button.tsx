import React from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`eq-btn eq-btn--${variant} eq-btn--${size} ${loading ? "eq-btn--loading" : ""} ${className}`}
    >
      {loading ? (
        <span className="eq-btn__spinner" aria-hidden="true" />
      ) : (
        icon && <span className="eq-btn__icon">{icon}</span>
      )}
      {children && <span className="eq-btn__label">{children}</span>}
    </button>
  );
}

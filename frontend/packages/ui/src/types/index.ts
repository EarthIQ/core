import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline';
export type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type Position = 'top' | 'right' | 'bottom' | 'left';
export type Alignment = 'start' | 'center' | 'end';

export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

export interface GlassProps {
  glassVariant?: 'default' | 'dark' | 'light';
  glow?: boolean;
  glowColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export interface ComponentProps extends BaseProps, GlassProps {
  size?: Size;
  variant?: Variant;
  rounded?: Rounded;
  disabled?: boolean;
  loading?: boolean;
}

export interface IconProps {
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}
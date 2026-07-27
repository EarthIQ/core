import { cva } from 'class-variance-authority';

export const glassBase = cva(
  'backdrop-blur-glass border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-white/10 border-white/20',
        dark: 'bg-black/30 border-white/10',
        light: 'bg-white/20 border-white/30',
        primary: 'bg-primary-500/20 border-primary-400/30',
        secondary: 'bg-secondary-500/20 border-secondary-400/30',
        success: 'bg-success-500/20 border-success-400/30',
        warning: 'bg-warning-500/20 border-warning-400/30',
        error: 'bg-error-500/20 border-error-400/30',
      },
      glow: {
        none: '',
        default: 'shadow-glass-glow',
        primary: 'shadow-[0_0_20px_rgba(99,102,241,0.4)]',
        success: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]',
        error: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      glow: 'none',
    },
  }
);

export const sizeVariants = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-5 py-2.5',
  xl: 'text-xl px-6 py-3',
};

export const roundedVariants = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};
import { type ReactNode, type HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';

interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** The content to display inside the stack */
  children: ReactNode;
  
  /**
   * The direction in which to layout children.
   * @default 'column'
   */
  direction?: 'row' | 'column';
  
  /**
   * The space between elements.
   * - `none`: 0px
   * - `xs`: 0.25rem (4px)
   * - `sm`: 0.5rem (8px)
   * - `md`: 1rem (16px)
   * - `lg`: 1.5rem (24px)
   * - `xl`: 2rem (32px)
   * @default 'md'
   */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * CSS `align-items` property.
   * Controls how items are aligned on the cross-axis.
   * @default 'stretch'
   */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  
  /**
   * CSS `justify-content` property.
   * Controls how items are distributed on the main axis.
   * @default 'start'
   */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  
  /**
   * Whether children should wrap to the next line/column.
   * @default false
   */
  wrap?: boolean;
}

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

/**
 * A Flexbox container component used to arrange elements linearly.
 * 
 * @example
 * // Basic usage
 * <Stack gap="lg" align="center">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Stack>
 */
export function Stack({
  children,
  direction = 'column',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Horizontal Stack. A shorthand for `<Stack direction="row" />`.
 * Arranges items in a horizontal line.
 */
export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="row" {...props} />;
}

/**
 * Vertical Stack. A shorthand for `<Stack direction="column" />`.
 * Arranges items in a vertical column.
 */
export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="column" {...props} />;
}
import React, { type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  attached = false,
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        attached && orientation === 'horizontal' && '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px',
        attached && orientation === 'vertical' && '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px',
        !attached && 'gap-2',
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}
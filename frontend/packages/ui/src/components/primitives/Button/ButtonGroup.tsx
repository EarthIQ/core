import React, { type ReactNode } from "react";

import { cn } from "../../../utils/cn";

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
  attached?: boolean;
}

export const ButtonGroup = ({
  children,
  className,
  orientation = "horizontal",
  attached = false,
}: ButtonGroupProps) => {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex",
        orientation === "vertical" ? "flex-col" : "flex-row",
        attached &&
          orientation === "horizontal" &&
          "[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
        attached &&
          orientation === "vertical" &&
          "[&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
        !attached && "gap-2",
        className
      )}
    >
      {children}
    </div>
  );
};

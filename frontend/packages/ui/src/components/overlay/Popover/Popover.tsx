import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { motion, AnimatePresence, type MotionStyle } from "framer-motion";
import React, { useState, type ReactNode } from "react";

import { useClickOutside } from "../../../hooks/useClickOutside";
import { cn } from "../../../utils/cn";

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  triggerType?: "click" | "hover";
  className?: string;
}

export const Popover = ({
  trigger,
  children,
  placement = "bottom",
  triggerType = "click",
  className,
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement,
    middleware: [offset(12), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const containerRef = useClickOutside<HTMLDivElement>(
    () => setIsOpen(false),
    isOpen && triggerType === "click"
  );

  const handleTrigger = () => {
    if (triggerType === "click") setIsOpen((v) => !v);
  };

  const hoverProps =
    triggerType === "hover"
      ? {
          onMouseEnter: () => setIsOpen(true),
          onMouseLeave: () => setIsOpen(false),
        }
      : {};

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      {...hoverProps}
    >
      <div
        ref={refs.setReference}
        onClick={handleTrigger}
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen ? <motion.div
            ref={refs.setFloating}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            style={floatingStyles as MotionStyle}
            transition={{ duration: 0.15 }}
            className={cn(
              "border-base bg-elevated shadow-elevated z-50 min-w-[200px] rounded-xl border p-4 text-base",
              className
            )}
          >
            {children}
          </motion.div> : null}
      </AnimatePresence>
    </div>
  );
}

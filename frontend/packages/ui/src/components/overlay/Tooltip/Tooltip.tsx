import React, { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { cn } from "../../../utils/cn";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: "top" | "right" | "bottom" | "left";
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  children,
  content,
  placement = "top",
  delay = 200,
  disabled,
  className,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout>>();

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  const handleMouseEnter = () => {
    if (disabled) return;
    const id = setTimeout(() => setIsOpen(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsOpen(false);
  };

  return (
    <div className="inline-block">
      <div
        ref={refs.setReference}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              color: "var(--text-primary)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "bg-elevated border-base shadow-elevated z-50 rounded-lg border px-3 py-1.5 text-sm backdrop-blur-sm",
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import React, { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { useEscapeKey } from "../../../hooks/useKeyboard";
import { cn } from "../../../utils/cn";
import { IconButton } from "../../primitives/Button/IconButton";

type DrawerPosition = "left" | "right" | "top" | "bottom";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  position?: DrawerPosition;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses: Record<DrawerPosition, Record<string, string>> = {
  left: { sm: "w-64", md: "w-80", lg: "w-96", xl: "w-[480px]" },
  right: { sm: "w-64", md: "w-80", lg: "w-96", xl: "w-[480px]" },
  top: { sm: "h-48", md: "h-64", lg: "h-80", xl: "h-96" },
  bottom: { sm: "h-48", md: "h-64", lg: "h-80", xl: "h-96" },
};

const positionClasses: Record<DrawerPosition, string> = {
  left: "left-0 top-0 h-full",
  right: "right-0 top-0 h-full",
  top: "top-0 left-0 w-full",
  bottom: "bottom-0 left-0 w-full",
};

const slideVariants: Record<
  DrawerPosition,
  { initial: object; animate: object; exit: object }
> = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  top: {
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
};

export const Drawer = ({
  isOpen,
  onClose,
  children,
  title,
  position = "right",
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}: DrawerProps) => {
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{ backgroundColor: "var(--overlay)" }}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Drawer Content */}
          <motion.div
            {...slideVariants[position]}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "absolute overflow-hidden",
              positionClasses[position],
              sizeClasses[position][size],
              className
            )}
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-primary)",
              borderWidth: "1px",
              boxShadow: "var(--shadow-xl)",
              ...(position === "left" && {
                borderRight: "1px solid var(--border-primary)",
              }),
              ...(position === "right" && {
                borderLeft: "1px solid var(--border-primary)",
              }),
              ...(position === "top" && {
                borderBottom: "1px solid var(--border-primary)",
              }),
              ...(position === "bottom" && {
                borderTop: "1px solid var(--border-primary)",
              }),
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b p-4"
              style={{ borderColor: "var(--border-primary)" }}
            >
              {title ? (
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {title}
                </h2>
              ) : null}
              {showCloseButton ? (
                <IconButton
                  label="Close drawer"
                  size="sm"
                  variant="ghost"
                  icon={
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  }
                  onClick={onClose}
                />
              ) : null}
            </div>

            {/* Body */}
            <div className="h-[calc(100%-65px)] overflow-auto p-4">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};

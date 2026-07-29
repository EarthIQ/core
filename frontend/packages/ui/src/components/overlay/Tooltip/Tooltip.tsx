import React, { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  useTransitionStyles,
  FloatingPortal,
  offset,
  flip,
  shift,
  arrow,
} from "@floating-ui/react";
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
  const arrowRef = React.useRef<HTMLDivElement>(null);

  const {
    refs,
    floatingStyles,
    context,
    middlewareData,
    placement: finalPlacement,
  } = useFloating({
    open: isOpen && !disabled,
    onOpenChange: setIsOpen,
    placement,
    strategy: "fixed",
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  const hover = useHover(context, {
    delay: { open: delay, close: 0 },
    move: false,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 100,
    initial: { opacity: 0, transform: "scale(0.95)" },
  });

  // Arrow position
  const side = finalPlacement.split("-")[0] as
    | "top"
    | "right"
    | "bottom"
    | "left";
  const staticSide = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  }[side];

  return (
    <>
      <div
        ref={refs.setReference}
        className="inline-block"
        {...getReferenceProps()}
      >
        {children}
      </div>

      <FloatingPortal>
        <AnimatePresence>
          {isMounted && !disabled && (
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                color: "var(--text-primary)",
                zIndex: 9999,
              }}
              {...getFloatingProps()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  "bg-elevated border-base shadow-elevated rounded-lg border px-3 py-1.5 text-sm whitespace-nowrap backdrop-blur-sm",
                  className
                )}
              >
                {content}
                <div
                  ref={arrowRef}
                  className="bg-elevated border-base absolute h-2 w-2 rotate-45"
                  style={{
                    left:
                      middlewareData.arrow?.x != null
                        ? `${middlewareData.arrow.x}px`
                        : "",
                    top:
                      middlewareData.arrow?.y != null
                        ? `${middlewareData.arrow.y}px`
                        : "",
                    [staticSide as string]: "-4px",
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}

// Modal.tsx
import { type ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../../utils/cn";
import { useEscapeKey } from "../../../hooks/useKeyboard";

// =========================================
// Types
// =========================================
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

// =========================================
// Constants
// =========================================
const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw]",
};

const SPRING_TRANSITION = {
  type: "spring",
  damping: 25,
  stiffness: 300,
} as const;

// =========================================
// Sub-components
// =========================================
const CloseButton = ({ onClose }: { onClose: () => void }) => (
  <button
    onClick={onClose}
    aria-label="Close modal"
    className={cn(
      "absolute top-4 right-4 cursor-pointer",
      "flex items-center justify-center",
      "h-8 w-8 rounded-lg",
      "transition-colors duration-150",
      "focus:outline-none focus-visible:ring-2"
    )}
    style={
      {
        color: "var(--text-tertiary)",
        "--hover-bg": "var(--surface-hover)",
        "--focus-ring": "var(--ring)",
      } as React.CSSProperties
    }
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
        "var(--surface-hover)";
      (e.currentTarget as HTMLButtonElement).style.color =
        "var(--text-primary)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
        "transparent";
      (e.currentTarget as HTMLButtonElement).style.color =
        "var(--text-tertiary)";
    }}
  >
    <X
      size={18}
      strokeWidth={2}
    />
  </button>
);

const ModalHeader = ({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) => {
  if (!title && !description) return null;

  return (
    <div className="mb-5 pr-8">
      {title && (
        <h2
          id="modal-title"
          className="text-lg leading-tight font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
      )}
      {description && (
        <p
          id="modal-description"
          className="mt-1.5 text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </p>
      )}
    </div>
  );
};

// =========================================
// Main Component
// =========================================
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: ModalProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEscapeKey(onClose, closeOnEscape && isOpen);

  // Mount the portal when opening
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    }
  }, [isOpen]);

  // Lock body scroll while portal is mounted (including during exit animation)
  useEffect(() => {
    if (!shouldRender) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [shouldRender]);

  // Safety fallback: ensure portal is removed even if animation never completes
  useEffect(() => {
    if (!isOpen && shouldRender) {
      const timeout = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, shouldRender]);

  // Unmount the portal after exit animation finishes
  const handleAnimationComplete = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  if (!shouldRender || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal)",
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={closeOnOverlayClick && isOpen ? onClose : undefined}
        className="absolute inset-0"
        style={{ backgroundColor: "var(--overlay)", pointerEvents: "auto" }}
      />

      {/* Dialog */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={
          isOpen
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.96, y: 16 }
        }
        transition={SPRING_TRANSITION}
        onAnimationComplete={handleAnimationComplete}
        className={cn(
          "relative mx-auto w-full p-6",
          SIZE_CLASSES[size],
          size === "full" && "max-h-[90vh] overflow-y-auto",
          className
        )}
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-primary)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          pointerEvents: "auto",
        }}
      >
        {showCloseButton && <CloseButton onClose={onClose} />}
        <ModalHeader
          title={title ?? ""}
          description={description ?? ""}
        />
        <div
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {children}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// =========================================
// Modal Footer
// =========================================
export function ModalFooter({
  children,
  className,
  align = "right",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center gap-3 pt-4",
        alignClass,
        className
      )}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {children}
    </div>
  );
}

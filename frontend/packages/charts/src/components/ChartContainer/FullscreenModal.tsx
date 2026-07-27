import React, { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@packages/ui";
import { ExitFullscreenIcon } from "../../icons";

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="bg-surface animate-fade-in fixed inset-0"
      style={{ zIndex: "var(--z-modal)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-modal-title"
    >
      {/* Header */}
      <header
        className={cn(
          "absolute top-0 right-0 left-0",
          "flex items-center justify-between",
          "px-6 py-4",
          "border-base border-b",
          "bg-surface"
        )}
      >
        <h2
          id="fullscreen-modal-title"
          className="text-base text-lg font-semibold"
        >
          {title || "Chart View"}
        </h2>
        <button
          onClick={onClose}
          className="btn btn-ghost flex items-center gap-2"
          aria-label="Exit fullscreen"
        >
          <ExitFullscreenIcon size={16} />
          <span className="text-sm">Exit Fullscreen</span>
        </button>
      </header>

      {/* Content */}
      <div className="pb-safe px-safe h-full pt-[72px]">
        <div className="chart-card-content chart-scrollbar h-full w-full overflow-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

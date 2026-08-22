import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PanelHeader } from "./PanelHeader";
import { PanelFooter } from "./PanelFooter";

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  title: string;
  subtitle: string;
  resetLabel: string;
  closeLabel: string;
  footerText: string;
  children: React.ReactNode;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  position?: "left" | "right";
}

/**
 * Main panel component for the accessibility widget
 */
export const Panel: React.FC<PanelProps> = ({
  isOpen,
  onClose,
  onReset,
  title,
  subtitle,
  resetLabel,
  closeLabel,
  footerText,
  children,
  buttonRef,
  position = "left",
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, buttonRef]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements =
      panel.querySelectorAll<HTMLElement>(focusableSelector);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    panel.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => panel.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // If click is inside the panel, ignore it
      if (panelRef.current?.contains(e.target as Node)) {
        return;
      }

      // If click is on the trigger button, ignore it (trigger button handles its own click)
      if (buttonRef?.current?.contains(e.target as Node)) {
        return;
      }

      // Otherwise, the click is outside both the panel and the trigger button
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/20 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
        style={{ zIndex: 99998 }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`
          animate-scale-in
          fixed bottom-4
          ${position === "right" ? "right-4" : "left-4"}
          flex flex-col
          max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] sm:w-[420px]
          overflow-hidden rounded-3xl
          border border-[var(--border-primary)]
          bg-[var(--bg-secondary)]
          shadow-2xl
        `}
        style={{
          transformOrigin:
            position === "right" ? "bottom right" : "bottom left",
          zIndex: 99999,
          maxHeight: "90vh",
        }}
      >
        <PanelHeader
          title={title}
          subtitle={subtitle}
          resetLabel={resetLabel}
          closeLabel={closeLabel}
          onReset={onReset}
          onClose={onClose}
        />

        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          {children}
        </div>

        <PanelFooter text={footerText} />
      </div>
    </>,
    document.body,
  );
};

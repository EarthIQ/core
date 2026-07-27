// src/components/controls/LayerPanel/LayerContextMenu.tsx

import React, { useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  Info,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";

interface LayerContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onZoomTo?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onShowProperties?: () => void;
  onDuplicate?: () => void;
  locked?: boolean;
  layerName?: string;
}

export const LayerContextMenu: React.FC<LayerContextMenuProps> = ({
  isOpen,
  onClose,
  onZoomTo,
  onDelete,
  onMoveUp,
  onMoveDown,
  onShowProperties,
  onDuplicate,
  locked = false,
  layerName = "Layer",
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to avoid closing immediately when the button click propagates
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems: Array<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
    dividerAfter?: boolean;
  }> = [
    {
      icon: <ZoomIn className="h-4 w-4" />,
      label: "Zoom to Layer",
      onClick: onZoomTo,
    },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${layerName}`}
      className="animate-in fade-in-0 zoom-in-95 absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] py-1 shadow-xl duration-100"
      style={{ transformOrigin: "top right" }}
    >
      {menuItems.map((item, index) => (
        <React.Fragment key={index}>
          <button
            role="menuitem"
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              item.danger
                ? "text-[var(--error)] hover:bg-red-50 dark:hover:bg-red-950/30"
                : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
          {item.dividerAfter && (
            <div className="my-1 h-px bg-[var(--border-secondary)]" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@packages/ui";
import {
  FullscreenIcon,
  ImageIcon,
  TableIcon,
  CopyIcon,
  CheckIcon,
  MoreVerticalIcon,
} from "../../icons";
import type { ToolbarConfig } from "../../types";

interface ChartToolbarProps {
  config: ToolbarConfig;
  onDownloadImage: (format: "png" | "jpeg" | "svg") => void;
  onDownloadData: (format: "csv" | "json") => void;
  onCopyData: () => void;
  onFullscreen: () => void;
  isExporting?: boolean;
  className?: string;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  config,
  onDownloadImage,
  onDownloadData,
  onCopyData,
  onFullscreen,
  isExporting,
  className,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const {
    downloadImage = true,
    downloadData = true,
    fullscreen = true,
    customActions = [],
  } = config;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!showDropdown) return;

      if (event.key === "Escape") {
        setShowDropdown(false);
        triggerRef.current?.focus();
      }
    },
    [showDropdown]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleCopy = async () => {
    await onCopyData();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="toolbar"
      aria-label="Chart actions"
    >
      {fullscreen && (
        <ToolbarButton
          onClick={onFullscreen}
          icon={<FullscreenIcon size={16} />}
          label="Fullscreen"
        />
      )}

      {downloadData && (
        <ToolbarButton
          onClick={handleCopy}
          icon={
            copied ? (
              <CheckIcon
                size={16}
                className="text-success"
              />
            ) : (
              <CopyIcon size={16} />
            )
          }
          label={copied ? "Copied!" : "Copy data"}
        />
      )}

      {(downloadImage || downloadData) && (
        <div
          className="relative"
          ref={dropdownRef}
        >
          <ToolbarButton
            ref={triggerRef}
            onClick={() => setShowDropdown(!showDropdown)}
            icon={<MoreVerticalIcon size={16} />}
            label="More options"
            disabled={isExporting}
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          />

          {showDropdown && (
            <div
              className="card-elevated animate-scale-in absolute top-full right-0 mt-1 min-w-[160px] py-1"
              style={{ zIndex: "var(--z-dropdown)" }}
              role="menu"
              aria-orientation="vertical"
            >
              {downloadImage && (
                <>
                  <DropdownHeader>Download Image</DropdownHeader>
                  <DropdownItem
                    icon={<ImageIcon size={14} />}
                    label="PNG"
                    onClick={() => {
                      onDownloadImage("png");
                      setShowDropdown(false);
                    }}
                  />
                  <DropdownItem
                    icon={<ImageIcon size={14} />}
                    label="JPEG"
                    onClick={() => {
                      onDownloadImage("jpeg");
                      setShowDropdown(false);
                    }}
                  />
                  <DropdownItem
                    icon={<ImageIcon size={14} />}
                    label="SVG"
                    onClick={() => {
                      onDownloadImage("svg");
                      setShowDropdown(false);
                    }}
                  />
                  <DropdownDivider />
                </>
              )}

              {downloadData && (
                <>
                  <DropdownHeader>Download Data</DropdownHeader>
                  <DropdownItem
                    icon={<TableIcon size={14} />}
                    label="CSV"
                    onClick={() => {
                      onDownloadData("csv");
                      setShowDropdown(false);
                    }}
                  />
                  <DropdownItem
                    icon={<TableIcon size={14} />}
                    label="JSON"
                    onClick={() => {
                      onDownloadData("json");
                      setShowDropdown(false);
                    }}
                  />
                </>
              )}

              {customActions.length > 0 && (
                <>
                  <DropdownDivider />
                  {customActions.map((action) => (
                    <DropdownItem
                      key={action.id}
                      icon={action.icon}
                      label={action.label}
                      onClick={() => {
                        action.onClick();
                        setShowDropdown(false);
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Toolbar Button Component
interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "menu" | "listbox" | "tree" | "grid" | "dialog" | boolean;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ onClick, icon, label, disabled, ...ariaProps }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md p-2",
        "text-muted",
        "hover:bg-surface-hover hover:text-base",
        "focus-visible:ring-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors"
      )}
      style={
        {
          "--tw-ring-color": "var(--ring)",
        } as React.CSSProperties
      }
      title={label}
      aria-label={label}
      {...ariaProps}
    >
      {icon}
    </button>
  )
);

ToolbarButton.displayName = "ToolbarButton";

// Dropdown Header Component
const DropdownHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="text-subtle px-3 py-1.5 text-xs font-medium">{children}</div>
);

// Dropdown Divider Component
const DropdownDivider: React.FC = () => (
  <div className="divider my-1 border-t" />
);

// Dropdown Item Component
interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 px-3 py-2",
      "text-base text-sm",
      "hover:bg-surface-hover",
      "transition-colors"
    )}
    role="menuitem"
  >
    <span className="text-muted">{icon}</span>
    {label}
  </button>
);

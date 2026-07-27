import React, { useState } from "react";
import { cn } from "../../../utils/cn";

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "away" | "busy";
  bordered?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
};

const statusSizes = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-4 h-4",
  "2xl": "w-5 h-5",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    "bg-[var(--primary)]",
    "bg-[var(--secondary)]",
    "bg-[var(--success)]",
    "bg-[var(--warning)]",
    "bg-[var(--error)]",
    "bg-[var(--info)]",
  ];
  const index = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  bordered = false,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = src && !imageError;
  const initials = name ? getInitials(name) : "?";
  const bgColor = name ? getColorFromName(name) : "bg-[var(--surface-active)]";

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full",
          sizeClasses[size],
          bordered && "ring-2 ring-[var(--ring-offset)]",
          !showImage && bgColor,
          className
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-medium text-[var(--text-on-primary)]">
            {initials}
          </span>
        )}
      </div>

      {status && (
        <StatusIndicator
          status={status}
          size={size}
        />
      )}
    </div>
  );
}

// Separate component to use inline styles for status colors
// since CSS custom properties can't be used directly in bg-* utilities
// without arbitrary value syntax for dynamic values
function StatusIndicator({
  status,
  size,
}: {
  status: NonNullable<AvatarProps["status"]>;
  size: NonNullable<AvatarProps["size"]>;
}) {
  const statusVar = {
    online: "var(--success)",
    offline: "var(--text-tertiary)",
    away: "var(--warning)",
    busy: "var(--error)",
  }[status];

  return (
    <span
      className={cn(
        "absolute right-0 bottom-0 rounded-full ring-2 ring-[var(--ring-offset)]",
        statusSizes[size]
      )}
      style={{ backgroundColor: statusVar }}
    />
  );
}

// Avatar Group
interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...avatar}
          size={size}
          bordered
          className="transition-transform hover:z-10 hover:scale-110"
        />
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full ring-2 ring-[var(--ring-offset)]",
            "bg-[var(--surface-active)]",
            sizeClasses[size]
          )}
        >
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}

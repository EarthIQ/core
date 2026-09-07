// src/components/controls/LayerPanel/LayerTypeIcon.tsx

import { Layers } from "lucide-react";
import React from "react";

interface LayerTypeIconProps {
  type: string;
  className?: string;
}

export const LayerTypeIcon: React.FC<LayerTypeIconProps> = ({
  type,
  className = "w-4 h-4",
}) => {
  const iconClass = `${className} flex-shrink-0`;

  switch (type) {
    case "fill":
      return (
        <svg
          aria-label="Fill layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          <line
            x1="12"
            x2="12"
            y1="22"
            y2="15.5"
          />
        </svg>
      );
    case "line":
      return (
        <svg
          aria-label="Line layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M3 20 L10 8 L16 14 L21 4" />
        </svg>
      );
    case "circle":
      return (
        <svg
          aria-label="Circle/Point layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
          />
        </svg>
      );
    case "symbol":
      return (
        <svg
          aria-label="Symbol layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle
            cx="12"
            cy="9"
            r="2.5"
          />
        </svg>
      );
    case "raster":
      return (
        <svg
          aria-label="Raster layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect
            height="18"
            rx="2"
            width="18"
            x="3"
            y="3"
          />
          <line
            x1="3"
            x2="21"
            y1="9"
            y2="9"
          />
          <line
            x1="3"
            x2="21"
            y1="15"
            y2="15"
          />
          <line
            x1="9"
            x2="9"
            y1="3"
            y2="21"
          />
          <line
            x1="15"
            x2="15"
            y1="3"
            y2="21"
          />
        </svg>
      );
    case "fill-extrusion":
      return (
        <svg
          aria-label="3D extrusion layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 3L2 8l10 5 10-5-10-5z" />
          <path d="M2 13l10 5 10-5" />
          <path d="M2 18l10 5 10-5" />
        </svg>
      );
    case "heatmap":
      return (
        <svg
          aria-label="Heatmap layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            opacity="0.3"
            r="10"
          />
          <circle
            cx="12"
            cy="12"
            opacity="0.6"
            r="6"
          />
          <circle
            cx="12"
            cy="12"
            r="2"
          />
        </svg>
      );
    case "hillshade":
      return (
        <svg
          aria-label="Hillshade layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M2 20L8 10L14 16L22 6" />
          <path d="M2 20H22" />
        </svg>
      );
    case "background":
      return (
        <svg
          aria-label="Background layer"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect
            height="18"
            rx="2"
            width="18"
            x="3"
            y="3"
          />
          <path
            d="M3 3L21 21"
            opacity="0.3"
          />
        </svg>
      );
    default:
      return (
        <Layers
          aria-label="Unknown layer type"
          className={iconClass}
        />
      );
  }
};

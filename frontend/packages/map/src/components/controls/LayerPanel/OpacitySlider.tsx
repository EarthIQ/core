import React, { useCallback, useRef } from "react";

interface OpacitySliderProps {
  /** Opacity value between 0 and 1 */
  value: number;
  /** Called with the new opacity value (0–1) on change */
  onChange: (value: number) => void;
  /** Disables the slider when true (e.g. layer is hidden or missing) */
  disabled?: boolean;
  /** Min opacity. Defaults to 0 */
  min?: number;
  /** Max opacity. Defaults to 1 */
  max?: number;
  /** Step increment. Defaults to 0.01 */
  step?: number;
  /** Accessible label. Defaults to "Opacity" */
  label?: string;
  /** Show numeric percentage readout. Defaults to true */
  showValue?: boolean;
}

export const OpacitySlider: React.FC<OpacitySliderProps> = ({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 1,
  step = 0.01,
  label = "Opacity",
  showValue = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      const clamped = Math.min(max, Math.max(min, raw));
      onChange(clamped);
    },
    [onChange, min, max]
  );

  const percentage = Math.round(value * 100);
  const trackFill = ((value - min) / (max - min)) * 100;

  return (
    <div
      className="opacity-slider"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? "none" : "auto",
        transition: `opacity var(--transition-normal) ease`,
        width: "100%",
        color: "var(--text-primary)",
      }}
    >
      {/* Slider track wrapper */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "4px",
          borderRadius: "2px",
          background: "var(--toggle-bg-off)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {/* Filled portion */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${trackFill}%`,
            borderRadius: "2px",
            background: "var(--primary)",
            transition: "width 0.05s linear",
          }}
        />

        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${percentage}%`}
          style={{
            position: "absolute",
            left: 0,
            width: "100%",
            opacity: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            margin: 0,
            padding: 0,
            // Expand click target vertically
            top: "-8px",
            height: "20px",
          }}
        />
      </div>

      {/* Percentage readout */}
      {showValue && (
        <span
          aria-hidden="true"
          style={{
            fontSize: "11px",
            fontVariantNumeric: "tabular-nums",
            color: "var(--text-secondary)",
            minWidth: "30px",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
};

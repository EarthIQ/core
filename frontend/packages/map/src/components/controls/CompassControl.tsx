import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useMap } from '../../hooks/useMap';

export interface CompassControlProps {
  /** Position on map */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Size in pixels */
  size?: number;
  /** Show degree value */
  showDegrees?: boolean;
  /** Show pitch indicator */
  showPitch?: boolean;
  /** Click to reset north */
  clickToResetNorth?: boolean;
  /** Animation duration */
  duration?: number;
  /** Custom className */
  className?: string;
  /** Compass style */
  style?: 'minimal' | 'classic' | 'modern';
  /** Callback on bearing change */
  onBearingChange?: (bearing: number) => void;
  /** Callback on pitch change */
  onPitchChange?: (pitch: number) => void;
}

export const CompassControl: React.FC<CompassControlProps> = ({
  position = 'top-right',
  size = 40,
  showDegrees = false,
  showPitch = false,
  clickToResetNorth = true,
  duration = 300,
  className,
  style: compassStyle = 'modern',
  onBearingChange,
  onPitchChange
}) => {
  const { map, isLoaded } = useMap();
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Update bearing and pitch from map events
  useEffect(() => {
    if (!map || !isLoaded) return;

    const updateBearing = () => {
      const newBearing = map.getBearing();
      const newPitch = map.getPitch();
      setBearing(newBearing);
      setPitch(newPitch);
      onBearingChange?.(newBearing);
      onPitchChange?.(newPitch);
    };

    updateBearing();
    map.on('rotate', updateBearing);
    map.on('pitch', updateBearing);

    return () => {
      map.off('rotate', updateBearing);
      map.off('pitch', updateBearing);
    };
  }, [map, isLoaded, onBearingChange, onPitchChange]);

  // Reset to north on click
  const handleClick = useCallback(() => {
    if (!map || !clickToResetNorth) return;
    
    map.easeTo({
      bearing: 0,
      pitch: 0,
      duration
    });
  }, [map, clickToResetNorth, duration]);

  // Format bearing for display
  const formattedBearing = useMemo(() => {
    const normalized = ((bearing % 360) + 360) % 360;
    return Math.round(normalized);
  }, [bearing]);

  // Get cardinal direction
  const cardinalDirection = useMemo(() => {
    const normalized = ((bearing % 360) + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalized / 45) % 8;
    return directions[index];
  }, [bearing]);

  // Position styles
  const positionStyles = useMemo(() => {
    const base = { position: 'absolute' as const, zIndex: 1000 };
    const offset = 10;
    
    switch (position) {
      case 'top-left':
        return { ...base, top: offset, left: offset };
      case 'top-right':
        return { ...base, top: offset, right: offset };
      case 'bottom-left':
        return { ...base, bottom: offset, left: offset };
      case 'bottom-right':
        return { ...base, bottom: offset, right: offset };
      default:
        return { ...base, top: offset, right: offset };
    }
  }, [position]);

  // Container styles
  const containerStyles: React.CSSProperties = useMemo(() => ({
    ...positionStyles,
    width: size,
    height: showPitch ? size + 20 : size,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    cursor: clickToResetNorth ? 'pointer' : 'default',
    userSelect: 'none',
  }), [positionStyles, size, showPitch, clickToResetNorth]);

  // Render minimal style compass
  const renderMinimalCompass = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{
        transform: `rotate(${-bearing}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Simple arrow */}
      <polygon
        points="20,4 24,20 20,16 16,20"
        fill="#e74c3c"
      />
      <polygon
        points="20,36 24,20 20,24 16,20"
        fill="#95a5a6"
      />
    </svg>
  );

  // Render classic style compass
  const renderClassicCompass = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{
        transform: `rotate(${-bearing}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Outer ring */}
      <circle
        cx="20"
        cy="20"
        r="18"
        fill="white"
        stroke="#333"
        strokeWidth="1.5"
      />
      {/* Inner circle */}
      <circle
        cx="20"
        cy="20"
        r="3"
        fill="#333"
      />
      {/* North needle */}
      <polygon
        points="20,4 23,18 20,15 17,18"
        fill="#e74c3c"
      />
      {/* South needle */}
      <polygon
        points="20,36 23,22 20,25 17,22"
        fill="#333"
      />
      {/* Cardinal markers */}
      <text x="20" y="10" textAnchor="middle" fontSize="6" fill="#e74c3c" fontWeight="bold">N</text>
      <text x="20" y="38" textAnchor="middle" fontSize="5" fill="#666">S</text>
      <text x="4" y="22" textAnchor="middle" fontSize="5" fill="#666">W</text>
      <text x="36" y="22" textAnchor="middle" fontSize="5" fill="#666">E</text>
    </svg>
  );

  // Render modern style compass
  const renderModernCompass = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
    >
      {/* Background circle */}
      <circle
        cx="20"
        cy="20"
        r="18"
        fill={isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)'}
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="1"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      />
      {/* Rotating compass needle group */}
      <g
        style={{
          transform: `rotate(${-bearing}deg)`,
          transformOrigin: '20px 20px',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* North indicator */}
        <path
          d="M20 6 L23 18 L20 15 L17 18 Z"
          fill="#e74c3c"
        />
        {/* South indicator */}
        <path
          d="M20 34 L23 22 L20 25 L17 22 Z"
          fill="#bdc3c7"
        />
        {/* N label */}
        <text
          x="20"
          y="5"
          textAnchor="middle"
          fontSize="4"
          fill="#e74c3c"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          N
        </text>
      </g>
      {/* Center dot */}
      <circle
        cx="20"
        cy="20"
        r="2"
        fill="#333"
      />
    </svg>
  );

  // Render compass based on style
  const renderCompass = () => {
    switch (compassStyle) {
      case 'minimal':
        return renderMinimalCompass();
      case 'classic':
        return renderClassicCompass();
      case 'modern':
      default:
        return renderModernCompass();
    }
  };

  // Render pitch indicator
  const renderPitchIndicator = () => {
    if (!showPitch) return null;

    return (
      <div
        style={{
          fontSize: 10,
          color: '#666',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '2px 6px',
          borderRadius: 4,
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        {Math.round(pitch)}°
      </div>
    );
  };

  // Render degree display
  const renderDegrees = () => {
    if (!showDegrees) return null;

    return (
      <div
        style={{
          position: 'absolute',
          bottom: showPitch ? 24 : 4,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9,
          color: '#666',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '1px 4px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
        }}
      >
        {formattedBearing}° {cardinalDirection}
      </div>
    );
  };

  // Don't render if map isn't loaded
  if (!isLoaded) return null;

  // Check if compass should be visible (non-zero bearing or pitch)
  const isRotated = Math.abs(bearing) > 0.1 || Math.abs(pitch) > 0.1;

  return (
    <div
      className={className}
      style={{
        ...containerStyles,
        opacity: isRotated || isHovered ? 1 : 0.6,
        transition: 'opacity 0.2s ease',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={clickToResetNorth ? 'Click to reset north' : `Bearing: ${formattedBearing}°`}
      role="button"
      aria-label={`Compass showing ${formattedBearing} degrees ${cardinalDirection}. ${clickToResetNorth ? 'Click to reset to north.' : ''}`}
      tabIndex={clickToResetNorth ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div style={{ position: 'relative' }}>
        {renderCompass()}
        {renderDegrees()}
      </div>
      {renderPitchIndicator()}
    </div>
  );
};

// Named export for convenience
export default CompassControl;
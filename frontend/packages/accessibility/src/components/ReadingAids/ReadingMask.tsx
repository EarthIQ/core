import React, { useState, useEffect } from 'react';

interface ReadingMaskProps {
  enabled: boolean;
}

/**
 * Reading mask - darkens everything except the current line
 * Helps users focus on one line at a time
 */
export const ReadingMask: React.FC<ReadingMaskProps> = ({ enabled }) => {
  const [position, setPosition] = useState({ y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  if (!enabled) return null;

  const maskHeight = 50; // Half the viewport height for the clear area

  return (
    <>
      {/* Top mask */}
      <div
        className="
          pointer-events-none fixed top-0 left-0 right-0 z-[9998]
          bg-black/80 transition-all duration-75
        "
        style={{ height: Math.max(0, position.y - maskHeight) }}
        aria-hidden="true"
      />
      
      {/* Bottom mask */}
      <div
        className="
          pointer-events-none fixed left-0 right-0 bottom-0 z-[9998]
          bg-black/80 transition-all duration-75
        "
        style={{ top: position.y + maskHeight }}
        aria-hidden="true"
      />
    </>
  );
};
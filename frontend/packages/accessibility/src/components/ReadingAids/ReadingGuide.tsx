import React, { useState, useEffect } from 'react';

interface ReadingGuideProps {
  enabled: boolean;
}

/**
 * Reading guide - a horizontal line that follows the cursor
 * Helps users track which line they're reading
 */
export const ReadingGuide: React.FC<ReadingGuideProps> = ({ enabled }) => {
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

  return (
    <div
      className="
        pointer-events-none fixed left-0 right-0 z-[9998]
        h-12 border-y-2 border-primary/60 bg-primary/10
      "
      style={{ top: position.y - 24 }}
      aria-hidden="true"
    />
  );
};
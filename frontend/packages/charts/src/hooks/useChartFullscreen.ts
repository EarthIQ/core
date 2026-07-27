import { useState, useCallback, useEffect } from 'react';

interface UseChartFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
}

export const useChartFullscreen = (): UseChartFullscreenReturn => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openFullscreen = useCallback(() => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    document.body.style.overflow = '';
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      closeFullscreen();
    } else {
      openFullscreen();
    }
  }, [isFullscreen, openFullscreen, closeFullscreen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        closeFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, closeFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    isFullscreen,
    toggleFullscreen,
    openFullscreen,
    closeFullscreen,
  };
};
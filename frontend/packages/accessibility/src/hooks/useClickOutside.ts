import { useEffect, RefObject } from 'react';

/**
 * Hook to detect clicks outside of specified elements
 */
export function useClickOutside(
  refs: RefObject<HTMLElement>[],
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const isOutside = refs.every(
        ref => ref.current && !ref.current.contains(event.target as Node)
      );
      
      if (isOutside) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handler, enabled]);
}
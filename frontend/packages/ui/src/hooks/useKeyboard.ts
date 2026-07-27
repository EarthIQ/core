import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyboardOptions {
  key: string;
  handler: KeyHandler;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboard({
  key,
  handler,
  enabled = true,
  preventDefault = false,
}: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === key) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    },
    [key, handler, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export function useEscapeKey(handler: () => void, enabled = true) {
  useKeyboard({ key: 'Escape', handler, enabled });
}
import { useState, useCallback } from 'react';

interface UseErrorBoundaryReturn {
  error: Error | null;
  hasError: boolean;
  showBoundary: (error: Error) => void;
  resetBoundary: () => void;
}

/**
 * Hook for programmatically triggering error boundaries
 * Useful for async errors that React's error boundary won't catch
 */
export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [error, setError] = useState<Error | null>(null);

  const showBoundary = useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetBoundary = useCallback(() => {
    setError(null);
  }, []);

  // If there's an error, throw it to be caught by the nearest error boundary
  if (error) {
    throw error;
  }

  return {
    error,
    hasError: error !== null,
    showBoundary,
    resetBoundary,
  };
}

/**
 * Hook for handling async operations with error boundary support
 */
export function useAsyncError() {
  const [, setError] = useState<Error | null>(null);

  const throwError = useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return throwError;
}
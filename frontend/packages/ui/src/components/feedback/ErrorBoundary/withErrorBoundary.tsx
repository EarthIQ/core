import React, { type ComponentType, type ErrorInfo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallback } from './ErrorFallback';

interface WithErrorBoundaryOptions {
  fallback?: React.ReactNode | ((error: Error, resetError: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  fallbackVariant?: 'default' | 'minimal' | 'full-page';
}

/**
 * HOC that wraps a component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const { fallback, onError, onReset, fallbackVariant = 'default' } = options;

  const ComponentWithErrorBoundary = (props: P) => {
    const defaultFallback = (error: Error, resetError: () => void) => (
      <ErrorFallback
        error={error}
        resetError={resetError}
        variant={fallbackVariant}
      />
    );

    return (
      <ErrorBoundary
        fallback={fallback || defaultFallback}
        onError={onError}
        onReset={onReset}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return ComponentWithErrorBoundary;
}
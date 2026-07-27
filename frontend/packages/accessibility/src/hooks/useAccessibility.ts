import { useContext } from 'react';
import { AccessibilityContext } from '../context/AccessibilityContext';
import type { AccessibilityContextType } from '../types';

/**
 * Hook to access accessibility settings and functions
 * Must be used within an AccessibilityProvider
 */
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error(
      'useAccessibility must be used within an AccessibilityProvider. ' +
      'Wrap your app with <AccessibilityProvider> to fix this error.'
    );
  }
  
  return context;
}
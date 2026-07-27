import { createContext } from 'react';
import type { AccessibilityContextType } from '../types';

/**
 * Context for accessibility settings
 */
export const AccessibilityContext = createContext<AccessibilityContextType | null>(null);
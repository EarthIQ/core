import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../utils/cn";

/**
 * Toast type variants
 */
type ToastType = "success" | "error" | "warning" | "info";

/**
 * Toast position options
 */
type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Individual toast item
 */
interface Toast {
  /** Unique identifier */
  id: string;
  /** Toast message content */
  message: string;
  /** Visual type/severity */
  type: ToastType;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration: number;
  /** Optional title/heading */
  title?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast creation options
 */
interface ToastOptions {
  /** Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss) */
  duration?: number;
  /** Optional title/heading */
  title?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast context type
 */
interface ToastContextType {
  /** Current active toasts */
  toasts: Toast[];
  /** Add a toast with custom type */
  addToast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions
  ) => string;
  /** Remove a specific toast by ID */
  removeToast: (id: string) => void;
  /** Remove all toasts */
  clearToasts: () => void;
  /** Show success toast */
  success: (message: string, options?: ToastOptions) => string;
  /** Show error toast */
  error: (message: string, options?: ToastOptions) => string;
  /** Show warning toast */
  warning: (message: string, options?: ToastOptions) => string;
  /** Show info toast */
  info: (message: string, options?: ToastOptions) => string;
}

/**
 * Toast provider props
 */
interface ToastProviderProps {
  children: ReactNode;
  /** Position of toast container */
  position?: ToastPosition;
  /** Maximum number of visible toasts */
  maxToasts?: number;
  /** Default duration for toasts */
  defaultDuration?: number;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast icons for each type
 */
const toastIcons: Record<ToastType, ReactNode> = {
  success: (
    <svg
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg
      className="h-5 w-5 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

/**
 * Toast styles for each type using theme CSS variables
 */
const toastStyles: Record<ToastType, string> = {
  success: cn(
    "border-[var(--success-border)] bg-[var(--success-bg)]",
    "[&_[data-icon]]:text-[var(--success)]",
    "[&_[data-title]]:text-[var(--success-text)]",
    "[&_[data-message]]:text-[var(--success-text)]"
  ),
  error: cn(
    "border-[var(--error-border)] bg-[var(--error-bg)]",
    "[&_[data-icon]]:text-[var(--error)]",
    "[&_[data-title]]:text-[var(--error-text)]",
    "[&_[data-message]]:text-[var(--error-text)]"
  ),
  warning: cn(
    "border-[var(--warning-border)] bg-[var(--warning-bg)]",
    "[&_[data-icon]]:text-[var(--warning)]",
    "[&_[data-title]]:text-[var(--warning-text)]",
    "[&_[data-message]]:text-[var(--warning-text)]"
  ),
  info: cn(
    "border-[var(--info-border)] bg-[var(--info-bg)]",
    "[&_[data-icon]]:text-[var(--info)]",
    "[&_[data-title]]:text-[var(--info-text)]",
    "[&_[data-message]]:text-[var(--info-text)]"
  ),
};

/**
 * Position classes for toast container
 */
const positionClasses: Record<ToastPosition, string> = {
  "top-left": "top-4 left-4 items-start",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-4 right-4 items-end",
  "bottom-left": "bottom-4 left-4 items-start",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-4 right-4 items-end",
};

/**
 * Animation variants based on position
 */
const getAnimationVariants = (position: ToastPosition) => {
  const isTop = position.startsWith("top");
  const isLeft = position.includes("left");
  const isRight = position.includes("right");

  return {
    initial: {
      opacity: 0,
      y: isTop ? -20 : 20,
      x: isLeft ? -20 : isRight ? 20 : 0,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      y: isTop ? -20 : 20,
      scale: 0.95,
      transition: { duration: 0.15 },
    },
  };
};

/**
 * Individual Toast Item Component
 */
function ToastItem({
  toast,
  onRemove,
  position,
}: {
  toast: Toast;
  onRemove: () => void;
  position: ToastPosition;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const pausedTimeRef = useRef(0);

  // Auto-dismiss with pause on hover
  useEffect(() => {
    if (toast.duration === 0) return;

    let animationFrameId: number;

    const animate = () => {
      if (!isHovered) {
        const elapsed =
          Date.now() - startTimeRef.current - pausedTimeRef.current;
        const remaining = Math.max(0, toast.duration - elapsed);
        const newProgress = (remaining / toast.duration) * 100;

        if (remaining <= 0) {
          onRemove();
        } else {
          setProgress(newProgress);
          animationFrameId = requestAnimationFrame(animate);
        }
      }
    };

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Handle hover pause
    if (isHovered) {
      pausedTimeRef.current =
        Date.now() - startTimeRef.current - pausedTimeRef.current;
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [toast.duration, isHovered, onRemove]);

  const variants = getAnimationVariants(position);

  // Use CSS variables with fallbacks that match your theme
  const getBackgroundStyle = (type: ToastType) => {
    const fallbacks: Record<ToastType, { light: string; dark: string }> = {
      success: {
        light: "oklch(0.95 0.05 145 / 1)",
        dark: "oklch(0.25 0.08 145 / 1)",
      },
      error: {
        light: "oklch(0.97 0.03 25 / 1)",
        dark: "oklch(0.25 0.1 25 / 1)",
      },
      warning: {
        light: "oklch(0.97 0.05 75 / 1)",
        dark: "oklch(0.3 0.08 75 / 1)",
      },
      info: {
        light: "oklch(0.96 0.03 220 / 1)", // Using primary blue hue
        dark: "oklch(0.25 0.06 220 / 1)",
      },
    };

    // Check if dark mode
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.matches('[data-theme="dark"]');

    return {
      backgroundColor: fallbacks[type][isDark ? "dark" : "light"],
      // CSS variable will override if available
      background: `var(--${type}-bg, ${fallbacks[type][isDark ? "dark" : "light"]})`,
    };
  };

  return (
    <motion.div
      layout
      initial={variants.initial}
      animate={variants.animate}
      exit={variants.exit}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="polite"
      className={cn(
        // Base styles
        "relative flex w-full max-w-sm items-start gap-3 overflow-hidden",
        "rounded-[var(--radius-lg)] border p-4",
        "shadow-[var(--shadow-lg)]",
        // Type-specific styles
        toastStyles[toast.type]
      )}
      style={getBackgroundStyle(toast.type)}
    >
      {/* Icon */}
      <span data-icon="">{toastIcons[toast.type]}</span>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1">
        {toast.title && (
          <p
            data-title=""
            className="text-sm font-semibold"
          >
            {toast.title}
          </p>
        )}
        <p
          data-message=""
          className="text-sm"
        >
          {toast.message}
        </p>

        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onRemove();
            }}
            className={cn(
              "mt-2 self-start text-sm font-medium underline underline-offset-2",
              "opacity-80 transition-opacity hover:opacity-100",
              "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onRemove}
        aria-label="Dismiss notification"
        className={cn(
          "flex-shrink-0 rounded-[var(--radius-md)] p-1",
          "opacity-60 transition-all duration-[var(--transition-fast)]",
          "hover:bg-[var(--surface-hover)] hover:opacity-100",
          "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        )}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden">
          <motion.div
            className="h-full bg-current opacity-20"
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Toast Provider Component
 *
 * Provides toast notification functionality to the application.
 * Wrap your app with this provider to enable toasts.
 *
 * @example
 * // In your app root
 * <ToastProvider position="bottom-right" maxToasts={5}>
 *   <App />
 * </ToastProvider>
 *
 * @example
 * // Using toasts in a component
 * function MyComponent() {
 *   const { success, error } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       success('Data saved successfully!');
 *     } catch (err) {
 *       error('Failed to save data');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 */
export function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options: ToastOptions = {}
    ): string => {
      const id = Math.random().toString(36).slice(2, 11);
      const { duration = defaultDuration, title, action } = options;

      setToasts((prev) => {
        const newToasts = [
          ...prev,
          { id, message, type, duration, title, action },
        ];
        // Limit number of toasts
        if (newToasts.length > maxToasts) {
          return newToasts.slice(-maxToasts);
        }
        return newToasts;
      });

      return id;
    },
    [defaultDuration, maxToasts]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, "success", options),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, "error", options),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, "warning", options),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast(message, "info", options),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}

      {/* Toast Container - Fixed with high z-index */}
      <div
        style={{ zIndex: "var(--z-toast, 9999)" }}
        className={cn(
          "pointer-events-none fixed flex flex-col gap-2",
          positionClasses[position]
        )}
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto"
            >
              <ToastItem
                toast={toast}
                onRemove={() => removeToast(toast.id)}
                position={position}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 *
 * @example
 * const { success, error, warning, info } = useToast();
 *
 * // Simple usage
 * success('Profile updated!');
 * error('Something went wrong');
 *
 * // With options
 * success('File uploaded', {
 *   title: 'Upload Complete',
 *   duration: 3000,
 *   action: {
 *     label: 'View file',
 *     onClick: () => navigate('/files'),
 *   },
 * });
 *
 * // Persistent toast (no auto-dismiss)
 * error('Connection lost', { duration: 0 });
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

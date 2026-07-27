import { useEffect } from "react";

export function usePerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (renderTime > 16) {
        // More than 1 frame (60fps)
        console.warn(
          `${componentName} took ${renderTime.toFixed(2)}ms to render`
        );
      }
    };
  }, [componentName]);
}

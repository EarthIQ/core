import React, { useMemo } from "react";
import { DndProvider as ReactDndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import type { DndProviderProps } from "./types";

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export const DndProvider: React.FC<DndProviderProps> = ({
  children,
  backend = "html5",
  adaptive = false,
}) => {
  const selectedBackend = useMemo(() => {
    if (adaptive) {
      return isTouchDevice() ? TouchBackend : HTML5Backend;
    }
    return backend === "touch" ? TouchBackend : HTML5Backend;
  }, [backend, adaptive]);

  const options = useMemo(() => {
    if (selectedBackend === TouchBackend) {
      return {
        enableMouseEvents: true,
        enableTouchEvents: true,
        delayTouchStart: 150,
      };
    }
    return undefined;
  }, [selectedBackend]);

  return (
    <ReactDndProvider
      backend={selectedBackend}
      options={options}
    >
      {children}
    </ReactDndProvider>
  );
};

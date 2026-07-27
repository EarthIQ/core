import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";

interface Position {
  x: number;
  y: number;
}

interface UseDraggablePositionOptions {
  initialPosition?: Position;
  bounds?: "parent" | "none";
}

const DEFAULT_INITIAL_POSITION: Position = { x: 20, y: 20 };

export const useDraggablePosition = ({
  initialPosition = DEFAULT_INITIAL_POSITION,
  bounds = "parent",
}: UseDraggablePositionOptions = {}) => {
  // ---- Pixel position for rendering (derived from percentage) ----------
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // ---- Drag offset (difference between mouse and element top‑left) -----
  const offsetRef = useRef<Position>({ x: 0, y: 0 });

  // ---- Authoritative position stored as 0‑100 % of movable space ------
  const intendedPercentRef = useRef<Position>({ x: 0, y: 0 });
  const initializedRef = useRef(false); // ensures we convert initialPosition only once

  // ---- Convert pixel coords to a percentage of the movable range ------
  const getPercent = useCallback(
    (pixelX: number, pixelY: number, maxX: number, maxY: number): Position => ({
      x: maxX > 0 ? (pixelX / maxX) * 100 : 0,
      y: maxY > 0 ? (pixelY / maxY) * 100 : 0,
    }),
    []
  );

  // ---- Recalculate pixel position from stored percentage --------------
  const syncPixelPosition = useCallback(() => {
    if (!dragRef.current || bounds !== "parent") return;
    const parent = dragRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const elemRect = dragRef.current.getBoundingClientRect();
    const maxX = parentRect.width - elemRect.width;
    const maxY = parentRect.height - elemRect.height;

    const px = (intendedPercentRef.current.x / 100) * maxX;
    const py = (intendedPercentRef.current.y / 100) * maxY;
    setPosition({ x: px, y: py });
  }, [bounds]);

  // ---- Initialise percentage from the given initialPosition (once) ----
  useLayoutEffect(() => {
    if (initializedRef.current || bounds !== "parent" || !dragRef.current) return;
    const parent = dragRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const elemRect = dragRef.current.getBoundingClientRect();
    const maxX = parentRect.width - elemRect.width;
    const maxY = parentRect.height - elemRect.height;

    // Clamp the provided initial position and convert to percentage
    const clampedX = Math.max(0, Math.min(initialPosition.x, maxX));
    const clampedY = Math.max(0, Math.min(initialPosition.y, maxY));
    intendedPercentRef.current = getPercent(clampedX, clampedY, maxX, maxY);
    setPosition({ x: clampedX, y: clampedY });
    initializedRef.current = true;
  }, [bounds, initialPosition, getPercent]);

  // ---- Keep position in sync when parent or element size changes ------
  useEffect(() => {
    if (bounds !== "parent" || !dragRef.current) return;
    const element = dragRef.current;
    const parent = element.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      if (initializedRef.current) {
        syncPixelPosition();
      }
    });

    observer.observe(parent);
    observer.observe(element); // also watch element size (e.g., content change)

    return () => observer.disconnect();
  }, [bounds, syncPixelPosition]);

  // ---- Common move handler – updates percentage then pixel state ------
  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      if (bounds === "none" || !dragRef.current) {
        // Free movement – directly set pixel position
        const newX = clientX - offsetRef.current.x;
        const newY = clientY - offsetRef.current.y;
        setPosition({ x: newX, y: newY });
        return;
      }

      // Constrained movement – clamp and store as percentage
      const parent = dragRef.current.parentElement!;
      const parentRect = parent.getBoundingClientRect();
      const elemRect = dragRef.current.getBoundingClientRect();
      const maxX = parentRect.width - elemRect.width;
      const maxY = parentRect.height - elemRect.height;

      let newX = clientX - offsetRef.current.x;
      let newY = clientY - offsetRef.current.y;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      intendedPercentRef.current = getPercent(newX, newY, maxX, maxY);
      setPosition({ x: newX, y: newY });
    },
    [bounds, getPercent]
  );

  // ---- Pointer / touch start ------------------------------------------
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      offsetRef.current = {
        x: e.clientX - (bounds === "none" ? position.x : position.x),
        y: e.clientY - (bounds === "none" ? position.y : position.y),
      };
    },
    [position, bounds]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      offsetRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      };
    },
    [position]
  );

  // ---- Global move / end listeners ------------------------------------
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => moveTo(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      moveTo(touch.clientX, touch.clientY);
    };
    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [isDragging, moveTo]);

  const setPercentPosition = useCallback((px: number, py: number) => {
    intendedPercentRef.current = { x: px, y: py };
    syncPixelPosition();
  }, [syncPixelPosition]);

  return {
    position,
    isDragging,
    dragRef,
    handleMouseDown,
    handleTouchStart,
    setPosition,
    setPercentPosition,
  };
};

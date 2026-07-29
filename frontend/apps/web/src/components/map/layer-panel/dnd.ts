export type DropPos = "before" | "after" | "inside";

/** Determine drop intent from vertical cursor position within a row. */
export function getDropPosition(
  e: React.DragEvent,
  el: HTMLElement,
  allowInside: boolean,
): DropPos {
  const rect = el.getBoundingClientRect();
  const relY = (e.clientY - rect.top) / rect.height;
  if (allowInside && relY > 0.25 && relY < 0.75) return "inside";
  return relY <= 0.5 ? "before" : "after";
}

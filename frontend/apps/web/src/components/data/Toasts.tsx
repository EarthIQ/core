import type { Toast } from "./types";

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      aria-live="polite"
      className="fixed right-5 bottom-5 z-[1100] flex flex-col items-end gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-fade-in flex max-w-xs cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === "success"
              ? "bg-success/10 text-success border-success/30 border"
              : t.type === "error"
                ? "bg-error/10 text-error border-error/30 border"
                : "bg-info/10 text-info border-info/30 border"
          }`}
          onClick={() => onDismiss(t.id)}
        >
          <span>
            {t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}
          </span>
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

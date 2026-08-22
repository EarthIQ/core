import type { Toast } from "./types";

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div
      className="fixed bottom-5 right-5 z-[1100] flex flex-col gap-2 items-end"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`cursor-pointer px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in max-w-xs ${
            t.type === "success"
              ? "bg-success/10 text-success border border-success/30"
              : t.type === "error"
                ? "bg-error/10 text-error border border-error/30"
                : "bg-info/10 text-info border border-info/30"
          }`}
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

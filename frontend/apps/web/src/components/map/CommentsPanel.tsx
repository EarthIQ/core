import { useState } from "react";
import { useMapEditor } from "@/lib/mapEditor/store";
import { useAuth } from "@/lib/auth";
import { MessageSquare, MapPin, Send, Trash2, X } from "lucide-react";

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function CommentsPanel({
  mapRef,
  mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) {
  const open = useMapEditor((s) => s.commentsOpen);
  const setOpen = useMapEditor((s) => s.setCommentsOpen);
  const comments = useMapEditor((s) => s.comments);
  const addComment = useMapEditor((s) => s.addComment);
  const removeComment = useMapEditor((s) => s.removeComment);
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [attachLocation, setAttachLocation] = useState(true);

  if (!open) return null;

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    const author = user?.full_name || user?.email || "You";
    let lngLat: [number, number] | undefined;
    if (attachLocation && mapRef.current) {
      const c = mapRef.current.getCenter();
      lngLat = [c.lng, c.lat];
    }
    addComment(body, author, lngLat);
    setDraft("");
  }

  function handleJump(lngLat: [number, number]) {
    mapRef.current?.flyTo({ center: lngLat, zoom: 14 });
  }

  return (
    <div className="absolute right-4 top-16 z-30 w-[320px] max-h-[calc(100%-6rem)] flex flex-col bg-elevated border border-border-primary rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <MessageSquare size={16} className="text-primary" />
        </span>
        <span className="text-sm font-semibold text-text-primary flex-1">
          Comments
          <span className="ml-2 text-xs font-normal text-text-tertiary">
            {comments.length}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {comments.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-text-tertiary">
            No comments yet.
            <br />
            Start the discussion below.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="group rounded-xl px-3 py-2 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary">
                  {c.author}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {formatTime(c.createdAt)}
                </span>
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.lngLat && (
                    <button
                      type="button"
                      onClick={() => handleJump(c.lngLat!)}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-primary"
                      aria-label="Show location"
                    >
                      <MapPin size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeComment(c.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-error"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-primary mt-0.5 whitespace-pre-wrap break-words">
                {c.body}
              </p>
              {c.lngLat && (
                <button
                  type="button"
                  onClick={() => handleJump(c.lngLat!)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-primary"
                >
                  <MapPin size={11} />
                  {c.lngLat[0].toFixed(4)}, {c.lngLat[1].toFixed(4)}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* composer */}
      <div className="px-3 py-3 border-t border-border-primary space-y-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-text-tertiary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attachLocation}
              onChange={(e) => setAttachLocation(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Pin to map center
          </label>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            placeholder="Write a comment…"
            rows={2}
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-input-bg border border-input-border text-text-primary resize-none focus:outline-none focus:border-input-focus-border"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send comment"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

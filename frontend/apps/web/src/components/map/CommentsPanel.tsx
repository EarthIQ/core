import { useState } from "react";
import {
  Check,
  MapPin,
  MessageSquare,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useMapEditor } from "@/lib/mapEditor/store";
import { useAuth } from "@/lib/auth";
import type { CommentThread } from "@/lib/mapEditor/types";

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatWhen(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

/** One row in the comments history list. */
function ThreadRow({
  thread,
  onJump,
}: {
  thread: CommentThread;
  onJump: (t: CommentThread) => void;
}) {
  const { user } = useAuth();
  const setThreadResolved = useMapEditor((s) => s.setThreadResolved);
  const removeThread = useMapEditor((s) => s.removeThread);

  const myId = user?.id ?? "";
  const me = user?.full_name || user?.email || "You";
  const opener = thread.messages[0];
  const last = thread.messages[thread.messages.length - 1];
  const replyCount = thread.messages.length - 1;
  const canDelete =
    !!user &&
    (user.is_superuser || (opener.authorId !== "" && opener.authorId === myId));

  return (
    <div
      className="group rounded-xl px-3 py-2.5 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shrink-0 border ${
            thread.resolved
              ? "bg-surface-hover text-text-tertiary border-border-primary"
              : "bg-primary/15 text-primary border-primary/20"
          }`}
        >
          {initials(opener.author)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-primary truncate">
              {opener.author}
            </span>
            <span className="text-[11px] text-text-tertiary">
              {formatWhen(thread.updatedAt)}
            </span>
            {replyCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-text-tertiary">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>
          <p
            className={`text-[13px] mt-0.5 truncate ${
              thread.resolved
                ? "text-text-tertiary line-through"
                : "text-text-primary"
            }`}
          >
            {last.authorId !== opener.authorId && replyCount > 0 && (
              <span className="text-text-tertiary">
                {last.author.split(" ")[0]}:{" "}
              </span>
            )}
            {last.body}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {thread.lngLat && (
          <button
            type="button"
            onClick={() => onJump(thread)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
          >
            <MapPin size={11} />
            Show on map
          </button>
        )}
        {thread.resolved ? (
          <button
            type="button"
            onClick={() => setThreadResolved(thread.id, false)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <RotateCcw size={11} />
            Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setThreadResolved(thread.id, true, myId, me)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-text-secondary hover:bg-success/10 hover:text-success transition-colors"
          >
            <Check size={11} />
            Resolve
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => removeThread(thread.id)}
            className="ml-auto flex items-center justify-center w-6 h-6 rounded-md text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Delete thread"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Comments history panel (toggled from the comments button in the top bar).
 * Lists open and resolved discussion threads; jumping to one flies the map
 * to the pin and opens its card on the map.
 */
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
  const setActiveThreadId = useMapEditor((s) => s.setActiveThreadId);
  const [tab, setTab] = useState<"open" | "resolved">("open");

  if (!open) return null;

  const openThreads = comments.filter((c) => !c.resolved);
  const resolvedThreads = comments.filter((c) => c.resolved);
  const shown = tab === "open" ? openThreads : resolvedThreads;

  function handleJump(t: CommentThread) {
    if (!t.lngLat || !mapRef.current) return;
    mapRef.current.flyTo({ center: t.lngLat, zoom: 15 });
    setActiveThreadId(t.id);
    setOpen(false);
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
            {openThreads.length} open
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

      {/* Open / Resolved tabs */}
      <div className="flex px-3 pt-2 gap-1">
        <button
          type="button"
          onClick={() => setTab("open")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "open"
              ? "bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          Open ({openThreads.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("resolved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            tab === "resolved"
              ? "bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
        >
          Resolved ({resolvedThreads.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {shown.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-text-tertiary">
            {tab === "open" ? (
              <>
                No open comments.
                <br />
                Use the comment tool in the bottom bar to drop a pin and
                start a discussion.
              </>
            ) : (
              <>
                No resolved comments yet.
                <br />
                Resolved threads will appear here.
              </>
            )}
          </div>
        ) : (
          shown.map((t) => (
            <ThreadRow key={t.id} thread={t} onJump={handleJump} />
          ))
        )}
      </div>
    </div>
  );
}

export default CommentsPanel;
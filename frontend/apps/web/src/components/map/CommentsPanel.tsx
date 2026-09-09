import {
  Check,
  MapPin,
  MessageSquare,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { renderBody } from "@/components/map/CommentPins";
import { useAuth } from "@/lib/auth";
import { useMapEditor } from "@/lib/mapEditor/store";

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
const ThreadRow = ({
  thread,
  onJump,
}: {
  thread: CommentThread;
  onJump: (t: CommentThread) => void;
}) => {
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
    <div className="group hover:bg-surface-hover rounded-xl px-3 py-2.5 transition-colors">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
            thread.resolved
              ? "bg-surface-hover text-text-tertiary border-border-primary"
              : "bg-primary/15 text-primary border-primary/20"
          }`}
        >
          {initials(opener.author)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-text-primary truncate text-xs font-semibold">
              {opener.author}
            </span>
            <span className="text-text-tertiary text-[11px]">
              {formatWhen(thread.updatedAt)}
            </span>
            {replyCount > 0 && (
              <span className="bg-surface-hover text-text-tertiary rounded-full px-1.5 py-0.5 text-[10px]">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </span>
            )}
          </div>
          <p
            className={`mt-0.5 truncate text-[13px] ${
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
            {renderBody(last.body, last.mentions, `row-${thread.id}`)}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {thread.lngLat ? (
          <button
            className="text-text-secondary hover:bg-surface-hover hover:text-primary flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
            type="button"
            onClick={() => onJump(thread)}
          >
            <MapPin size={11} />
            Show on map
          </button>
        ) : null}
        {thread.resolved ? (
          <button
            className="text-text-secondary hover:bg-surface-hover flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
            type="button"
            onClick={() => setThreadResolved(thread.id, false)}
          >
            <RotateCcw size={11} />
            Reopen
          </button>
        ) : (
          <button
            className="text-text-secondary hover:bg-success/10 hover:text-success flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
            type="button"
            onClick={() => setThreadResolved(thread.id, true, myId, me)}
          >
            <Check size={11} />
            Resolve
          </button>
        )}
        {canDelete ? (
          <button
            aria-label="Delete thread"
            className="text-text-tertiary hover:text-error hover:bg-error/10 ml-auto flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            type="button"
            onClick={() => removeThread(thread.id)}
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Comments history panel (toggled from the comments button in the top bar).
 * Lists open and resolved discussion threads; jumping to one flies the map
 * to the pin and opens its card on the map.
 */
export const CommentsPanel = ({
  mapRef,
  _mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) => {
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
    <div className="bg-elevated border-border-primary animate-fade-in-up absolute top-16 right-4 z-30 flex max-h-[calc(100%-6rem)] w-[320px] flex-col overflow-hidden rounded-2xl border shadow-xl">
      <div className="border-border-primary flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
          <MessageSquare
            className="text-primary"
            size={16}
          />
        </span>
        <span className="text-text-primary flex-1 text-sm font-semibold">
          Comments
          <span className="text-text-tertiary ml-2 text-xs font-normal">
            {openThreads.length} open
          </span>
        </span>
        <button
          aria-label="Close"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={() => setOpen(false)}
        >
          <X size={15} />
        </button>
      </div>

      {/* Open / Resolved tabs */}
      <div className="flex gap-1 px-3 pt-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "open"
              ? "bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
          onClick={() => setTab("open")}
        >
          Open ({openThreads.length})
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "resolved"
              ? "bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-surface-hover"
          }`}
          onClick={() => setTab("resolved")}
        >
          Resolved ({resolvedThreads.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {shown.length === 0 ? (
          <div className="text-text-tertiary px-3 py-6 text-center text-sm">
            {tab === "open" ? (
              <>
                No open comments.
                <br />
                Use the comment tool in the bottom bar to drop a pin and start a
                discussion.
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
            <ThreadRow
              key={t.id}
              thread={t}
              onJump={handleJump}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsPanel;

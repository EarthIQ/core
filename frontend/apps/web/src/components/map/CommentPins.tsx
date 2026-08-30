import { useEffect, useRef, useState } from "react";
import { Check, Send, Trash2, X } from "lucide-react";
import { useMapEditor } from "@/lib/mapEditor/store";
import { useAuth } from "@/lib/auth";
import type { CommentThread } from "@/lib/mapEditor/types";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Constants + helpers                                                      */
/* ──────────────────────────────────────────────────────────────────────── */
const CARD_W = 300;
const CARD_GAP = 14;

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatWhen(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${time}`;
}

function Avatar({
  name,
  size = 24,
  muted = false,
}: {
  name: string;
  size?: number;
  muted?: boolean;
}) {
  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold shrink-0 select-none ${
        muted
          ? "bg-surface-hover text-text-tertiary border border-border-primary"
          : "bg-primary/15 text-primary border border-primary/20"
      }`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Drop-shaped pin with the author's initials                               */
/* ──────────────────────────────────────────────────────────────────────── */
function CommentPin({
  author,
  resolved,
  active = false,
  ghost = false,
  onClick,
}: {
  author: string;
  resolved: boolean;
  active?: boolean;
  ghost?: boolean;
  onClick?: () => void;
}) {
  const color = resolved ? "var(--success)" : "var(--primary)";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={
        ghost
          ? "New comment"
          : `Comment by ${author}${resolved ? " (resolved)" : ""}`
      }
      className={`pointer-events-auto relative w-[30px] h-[30px] transition-transform duration-150 ${
        onClick ? "cursor-pointer hover:scale-110" : ""
      } ${ghost ? "opacity-80" : ""}`}
      style={{
        outline: active ? "2px solid var(--primary)" : "none",
        outlineOffset: 3,
        borderRadius: "50%",
      }}
    >
      {/* teardrop body: square with a sharp bottom-left corner, rotated -45°
          so the tip points straight down at the map point */}
      <div
        className="absolute inset-[3px] -rotate-45 rounded-[50%_50%_50%_0] border-2 border-white shadow-lg flex items-center justify-center"
        style={{ background: color }}
      >
        <span className="rotate-45 text-[10px] font-bold text-white leading-none select-none">
          {initials(author)}
        </span>
      </div>
      {resolved && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-elevated flex items-center justify-center shadow-sm">
          <Check size={9} strokeWidth={3.5} className="text-white" />
        </span>
      )}
      {active && !resolved && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Open-thread card (messages + replies + resolve/reopen/delete)            */
/* ──────────────────────────────────────────────────────────────────────── */
function ThreadCard({ thread }: { thread: CommentThread }) {
  const { user } = useAuth();
  const replyToThread = useMapEditor((s) => s.replyToThread);
  const setThreadResolved = useMapEditor((s) => s.setThreadResolved);
  const removeThread = useMapEditor((s) => s.removeThread);
  const setActiveThreadId = useMapEditor((s) => s.setActiveThreadId);
  const [reply, setReply] = useState("");

  const me = user?.full_name || user?.email || "You";
  const myId = user?.id ?? "";
  const opener = thread.messages[0];
  const replyCount = thread.messages.length - 1;
  const canDelete =
    !!user &&
    (user.is_superuser || (opener.authorId !== "" && opener.authorId === myId));

  function send() {
    const body = reply.trim();
    if (!body) return;
    replyToThread(thread.id, body, me, myId);
    setReply("");
  }

  return (
    <div className="rounded-2xl bg-elevated border border-border-primary shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
      {/* header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-primary">
        <Avatar name={opener.author} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary truncate">
            {opener.author}
          </p>
          <p className="text-[11px] text-text-tertiary">
            {formatWhen(opener.createdAt)}
            {replyCount > 0 &&
              ` · ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveThreadId(null)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close comment"
        >
          <X size={14} />
        </button>
      </div>

      {/* resolved banner */}
      {thread.resolved && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-success/10 border-b border-success/30">
          <Check size={13} className="text-success shrink-0" />
          <span className="text-xs text-success flex-1">
            {thread.resolvedByName
              ? `Resolved by ${thread.resolvedByName}`
              : "Resolved"}
          </span>
          <button
            type="button"
            onClick={() => setThreadResolved(thread.id, false)}
            className="text-xs font-medium text-text-secondary hover:text-text-primary underline underline-offset-2"
          >
            Reopen
          </button>
        </div>
      )}

      {/* messages */}
      <div className="flex-1 overflow-y-auto max-h-[210px] min-h-[56px] px-3.5 py-3 space-y-3">
        {thread.messages.map((m, i) => (
          <div key={m.id} className="flex gap-2">
            <div className="pt-0.5">
              <Avatar name={m.author} size={i === 0 ? 22 : 18} muted={i !== 0} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-semibold ${
                    i === 0
                      ? "text-[13px] text-text-primary"
                      : "text-[11px] text-text-secondary"
                  }`}
                >
                  {m.author}
                  {m.authorId === myId && myId !== "" && (
                    <span className="ml-1 text-[10px] font-normal text-text-tertiary">
                      you
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {formatWhen(m.createdAt)}
                </span>
              </div>
              <p className="text-[13px] text-text-primary whitespace-pre-wrap break-words leading-snug">
                {m.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* reply composer */}
      <div className="px-3 py-2.5 border-t border-border-primary">
        <div className="flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Reply to ${opener.author.split(" ")[0]}…`}
            rows={2}
            className="flex-1 px-3 py-2 text-[13px] rounded-lg bg-input-bg border border-input-border text-text-primary resize-none focus:outline-none focus:border-input-focus-border"
          />
          <button
            type="button"
            onClick={send}
            disabled={!reply.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send reply"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-t border-border-primary">
        {!thread.resolved && (
          <button
            type="button"
            onClick={() => setThreadResolved(thread.id, true, myId, me)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-success/10 hover:text-success transition-colors"
          >
            <Check size={13} />
            Resolve
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              removeThread(thread.id);
              setActiveThreadId(null);
            }}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-tertiary hover:bg-error/10 hover:text-error transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Composer card for a freshly dropped pin (first message)                  */
/* ──────────────────────────────────────────────────────────────────────── */
function ComposerCard({ lngLat }: { lngLat: [number, number] }) {
  const { user } = useAuth();
  const addThread = useMapEditor((s) => s.addThread);
  const setPendingCommentLocation = useMapEditor(
    (s) => s.setPendingCommentLocation,
  );
  const [body, setBody] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const me = user?.full_name || user?.email || "You";
  const myId = user?.id ?? "";

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  function post() {
    const text = body.trim();
    if (!text) return;
    addThread(lngLat, text, me, myId);
  }

  return (
    <div className="rounded-2xl bg-elevated border border-border-primary shadow-2xl overflow-hidden animate-fade-in-up">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-primary">
        <Avatar name={me} size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-text-primary truncate">
            {me}
          </p>
          <p className="text-[11px] text-text-tertiary">New comment</p>
        </div>
        <button
          type="button"
          onClick={() => setPendingCommentLocation(null)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Cancel comment"
        >
          <X size={14} />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              post();
            }
          }}
          placeholder="What would you like to say about this spot?"
          rows={3}
          className="w-full px-3 py-2 text-[13px] rounded-lg bg-input-bg border border-input-border text-text-primary resize-none focus:outline-none focus:border-input-focus-border"
        />
      </div>
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-border-primary">
        <button
          type="button"
          onClick={() => setPendingCommentLocation(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={post}
          disabled={!body.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={12} />
          Post
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Overlay: a pin per thread + the open card / composer                     */
/* ──────────────────────────────────────────────────────────────────────── */
export function CommentPins({
  mapRef,
  mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) {
  const comments = useMapEditor((s) => s.comments);
  const pending = useMapEditor((s) => s.pendingCommentLocation);
  const placing = useMapEditor((s) => s.commentPlacement);
  const activeThreadId = useMapEditor((s) => s.activeThreadId);
  const setActiveThreadId = useMapEditor((s) => s.setActiveThreadId);
  const { user } = useAuth();

  const me = user?.full_name || user?.email || "You";

  const containerRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const pinnedThreads = comments.filter((c) => c.lngLat !== null);
  const activeThread =
    pinnedThreads.find((c) => c.id === activeThreadId) ?? null;

  /* Position pins + card imperatively on every map move. */
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !mapReady) return;

    const position = () => {
      const place = (
        el: HTMLDivElement | null,
        lngLat: [number, number],
      ) => {
        if (!el) return;
        try {
          const pt = map.project(lngLat);
          el.style.transform = `translate(-50%, calc(-100% - 3px)) translate(${pt.x}px, ${pt.y}px)`;
          el.style.visibility = "";
        } catch {
          el.style.visibility = "hidden";
        }
      };

      for (const t of pinnedThreads) {
        if (t.lngLat) place(pinRefs.current[t.id], t.lngLat);
      }
      if (pending) place(pinRefs.current["__pending"], pending);

      const card = cardRef.current;
      const cardLngLat = activeThread?.lngLat ?? pending ?? null;
      if (card) {
        if (cardLngLat) {
          const pt = map.project(cardLngLat);
          const w = container.clientWidth;
          const h = container.clientHeight;
          const onLeft = pt.x + CARD_GAP + CARD_W > w - 8;
          card.style.left = `${
            onLeft ? pt.x - CARD_W - CARD_GAP : pt.x + CARD_GAP
          }px`;
          card.style.top = `${Math.max(
            64,
            Math.min(pt.y - 180, Math.max(64, h - 420)),
          )}px`;
          card.style.visibility = "";
        } else {
          card.style.visibility = "hidden";
        }
      }
    };

    position();
    map.on("move", position);
    map.on("resize", position);
    return () => {
      map.off("move", position);
      map.off("resize", position);
    };
  }, [pinnedThreads, activeThread, pending, mapRef, mapReady]);

  /* Note: MapPage makes the map canvas inert to mouse input while a comment
     is being placed / composed, so the view can never pan/zoom/double-click
     under the cursor. The ghost pin below tracks the cursor via a
     document-level mousemove listener (independent of canvas pointer events). */

  /* Ghost pin following the cursor while placement mode is active.
     Document-level listener (the canvas is input-locked, so it gets no
     mousemove events of its own). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !placing || pending) return;
    const onMove = (e: MouseEvent) => {
      const el = ghostRef.current;
      if (!el) return;
      const canvas = map.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside =
        x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      el.style.opacity = inside ? "" : "0";
      if (!inside) return;
      try {
        const p = map.unproject([x, y]);
        const pt = map.project([p.lng, p.lat]);
        el.style.transform = `translate(-50%, calc(-100% - 3px)) translate(${pt.x}px, ${pt.y}px)`;
      } catch {
        el.style.opacity = "0";
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [placing, pending, mapReady, mapRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
    >
      {/* thread pins */}
      {pinnedThreads.map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            pinRefs.current[t.id] = el;
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <CommentPin
            author={t.messages[0].author}
            resolved={t.resolved}
            active={t.id === activeThreadId}
            onClick={() => setActiveThreadId(t.id)}
          />
        </div>
      ))}

      {/* pending pin (awaiting its first message) */}
      {pending && (
        <div
          ref={(el) => {
            pinRefs.current["__pending"] = el;
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <CommentPin author={me} resolved={false} active />
        </div>
      )}

      {/* ghost preview while placing (hidden until the cursor moves) */}
      {placing && !pending && (
        <div
          ref={ghostRef}
          className="absolute top-0 left-0 pointer-events-none will-change-transform"
          style={{ transform: "translate(-50%, -100%)", opacity: 0 }}
        >
          <CommentPin author={me} resolved={false} ghost />
        </div>
      )}

      {/* open card: thread or composer (one at a time) */}
      {(activeThread || pending) && (
        <div
          ref={cardRef}
          className="absolute top-0 left-0"
          style={{ width: CARD_W, visibility: "hidden" }}
        >
          {activeThread ? (
            <ThreadCard thread={activeThread} />
          ) : (
            pending && <ComposerCard lngLat={pending} />
          )}
        </div>
      )}
    </div>
  );
}

export default CommentPins;
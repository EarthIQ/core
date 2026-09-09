import { Check, MessageCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MentionTextarea } from "@/components/map/MentionTextarea";
import { useAuth } from "@/lib/auth";
import { useMapEditor } from "@/lib/mapEditor/store";
import { sendMention, type PeopleSearchResult } from "@/lib/notifications";

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
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${time}`;
}

const Avatar = ({
  name,
  size = 24,
  muted = false,
}: {
  name: string;
  size?: number;
  muted?: boolean;
}) => {
  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold select-none ${
        muted
          ? "bg-surface-hover text-text-tertiary border-border-primary border"
          : "bg-primary/15 text-primary border-primary/20 border"
      }`}
    >
      {initials(name)}
    </span>
  );
};

/** Display name for a mentioned user (full name preferred, else email). */
function mentionName(u: PeopleSearchResult): string {
  return (u.name && u.name.trim()) || u.email || "";
}

/** Convert picked users into the `{id,name}` shape the store persists. */
function toMentions(users: PeopleSearchResult[]) {
  return users
    .map((u) => ({ id: u.id, name: mentionName(u) }))
    .filter((m) => m.name.length > 0);
}

/** Send a mention notification to every picked user still present in the text. */
function notifyMentioned(
  users: PeopleSearchResult[],
  text: string,
  author: string,
  authorId: string,
  projectId: string | undefined,
  projectName: string | undefined,
  lngLat: [number, number] | null
) {
  const clip = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  for (const u of users) {
    if (u.id === authorId) continue; // never notify yourself
    const name = mentionName(u);
    if (!name) continue;
    if (!text.includes(`@${name}`)) continue; // mention removed after picking
    sendMention({
      toUserId: u.id,
      title: projectName
        ? `You were mentioned on “${projectName}”`
        : "You were mentioned in a comment",
      body: `${author} mentioned you: “${clip}”`,
      link: projectId
        ? `/map?projectId=${encodeURIComponent(projectId)}`
        : null,
      payload: { project_id: projectId ?? null, lngLat },
    }).catch(() => {}); // best-effort - the comment itself is already saved
  }
}

/** A single highlighted mention pill (used by {@link renderBody}). */
const MentionPill = ({ name }: { name: string }) => {
  return (
    <span
      className="inline-flex items-center rounded-full align-middle"
      style={{
        background: "color-mix(in oklab, var(--primary) 14%, transparent)",
        color: "var(--primary)",
        border:
          "1px solid color-mix(in oklab, var(--primary) 24%, transparent)",
        padding: "0 6px",
        margin: "0 1px",
        fontSize: "12px",
        lineHeight: "18px",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
};

/**
 * Render a plain-text comment body with `@Name` mentions shown as pills.
 *
 * When the message's explicit `mentions` list is available (the usual case),
 * we match those **exact** names so a multi-word name like "John Doe" is
 * wrapped whole - no guessing where the name ends. Falls back to a best-effort
 * single `@Word` pill for legacy messages that predate the mentions field.
 */
export function renderBody(
  text: string,
  mentions?: { id: string; name: string }[],
  keyPrefix = "body"
) {
  const names = (mentions ?? [])
    .map((m) => (m.name || "").trim())
    .filter((n) => n.length > 0)
    // Prefer longer names so "John" never shadows "John Doe".
    .sort((a, b) => b.length - a.length);

  if (names.length) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(@(?:${names.map(esc).join("|")}))`, "g");
    const parts = text.split(re);
    return parts.map((p, i) =>
      names.some((n) => `@${n}` === p) ? (
        <MentionPill
          key={`${keyPrefix}-${i}`}
          name={p.slice(1)}
        />
      ) : (
        p
      )
    );
  }

  // Fallback: no explicit mention list - best-effort single-word pills.
  const parts = text.split(/(@[\w][\w'./-]*)(?=\s|$)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <MentionPill
        key={`${keyPrefix}-${i}`}
        name={p.slice(1)}
      />
    ) : (
      p
    )
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Speech-bubble pin (lucide MessageCircle) with the author's initials     */
/* ──────────────────────────────────────────────────────────────────────── */
const CommentPin = ({
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
}) => {
  const color = resolved ? "var(--success)" : "var(--primary)";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      aria-label={
        ghost
          ? "New comment"
          : `Comment by ${author}${resolved ? " (resolved)" : ""}`
      }
      className={`pointer-events-auto relative h-[34px] w-[42px] transition-transform duration-150 ${
        onClick ? "cursor-pointer hover:scale-110" : ""
      } ${ghost ? "opacity-80" : ""}`}
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
    >
      {/* speech bubble (lucide MessageCircle): the icon's tail tip sits at
          ≈(2,21) in its 24×24 viewBox, so at size 26 placed at left 19 /
          top 11 the tip lands on the hitbox bottom-center (21, ~34) - exactly
          where the standard pin placement (bottom-center anchor) points the
          pin at the map location */}
      <MessageCircle
        className="absolute text-white"
        fill={color}
        size={26}
        strokeWidth={2}
        style={{ left: 19, top: 11 }}
      />
      {/* initials centered over the bubble body - the MessageCircle path is
          a circle of r=10 centered at (12,12) in the 24×24 viewBox, which is
          (13,13) at size 26 → (32,24) in the hitbox with the icon at (19,11) */}
      <span
        className="absolute flex items-center justify-center text-[10px] leading-none font-bold text-white select-none"
        style={{ left: 25, top: 17, width: 14, height: 14 }}
      >
        {initials(author)}
      </span>
      {/* active thread: a tight ring hugging the bubble only (the resolved
          state is conveyed by the green fill, so no separate ✓ badge) */}
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 17,
            top: 9,
            width: 30,
            height: 30,
            borderRadius: 13,
            boxShadow: "0 0 0 2px var(--primary)",
          }}
        />
      ) : null}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Open-thread card (messages + replies + resolve/reopen/delete)            */
/* ──────────────────────────────────────────────────────────────────────── */
const ThreadCard = ({
  thread,
  projectId,
  projectName,
}: {
  thread: CommentThread;
  projectId?: string;
  projectName?: string;
}) => {
  const { user } = useAuth();
  const replyToThread = useMapEditor((s) => s.replyToThread);
  const setThreadResolved = useMapEditor((s) => s.setThreadResolved);
  const removeThread = useMapEditor((s) => s.removeThread);
  const setActiveThreadId = useMapEditor((s) => s.setActiveThreadId);
  const [reply, setReply] = useState("");
  const [mentioned, setMentioned] = useState<PeopleSearchResult[]>([]);
  const [replyKey, setReplyKey] = useState(0); // bump ⇒ remount (clear) the editor

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
    replyToThread(thread.id, body, me, myId, toMentions(mentioned));
    notifyMentioned(
      mentioned,
      body,
      me,
      myId,
      projectId,
      projectName,
      thread.lngLat
    );
    setReply("");
    setMentioned([]);
    setReplyKey((k) => k + 1);
  }

  return (
    <div className="bg-elevated border-border-primary animate-fade-in-up flex flex-col overflow-hidden rounded-2xl border shadow-2xl">
      {/* header */}
      <div className="border-border-primary flex items-center gap-2.5 border-b px-3.5 py-2.5">
        <Avatar
          name={opener.author}
          size={28}
        />
        <div className="min-w-0 flex-1">
          <p className="text-text-primary truncate text-[13px] font-semibold">
            {opener.author}
          </p>
          <p className="text-text-tertiary text-[11px]">
            {formatWhen(opener.createdAt)}
            {replyCount > 0 &&
              ` · ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
          </p>
        </div>
        <button
          aria-label="Close comment"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={() => setActiveThreadId(null)}
        >
          <X size={14} />
        </button>
      </div>

      {/* resolved banner */}
      {thread.resolved ? (
        <div className="bg-success/10 border-success/30 flex items-center gap-2 border-b px-3.5 py-2">
          <Check
            className="text-success shrink-0"
            size={13}
          />
          <span className="text-success flex-1 text-xs">
            {thread.resolvedByName
              ? `Resolved by ${thread.resolvedByName}`
              : "Resolved"}
          </span>
          <button
            className="text-text-secondary hover:text-text-primary text-xs font-medium underline underline-offset-2"
            type="button"
            onClick={() => setThreadResolved(thread.id, false)}
          >
            Reopen
          </button>
        </div>
      ) : null}

      {/* messages */}
      <div className="max-h-[210px] min-h-[56px] flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
        {thread.messages.map((m, i) => (
          <div
            key={m.id}
            className="flex gap-2"
          >
            <div className="pt-0.5">
              <Avatar
                muted={i !== 0}
                name={m.author}
                size={i === 0 ? 22 : 18}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-semibold ${
                    i === 0
                      ? "text-text-primary text-[13px]"
                      : "text-text-secondary text-[11px]"
                  }`}
                >
                  {m.author}
                  {m.authorId === myId && myId !== "" && (
                    <span className="text-text-tertiary ml-1 text-[10px] font-normal">
                      you
                    </span>
                  )}
                </span>
                <span className="text-text-tertiary text-[10px]">
                  {formatWhen(m.createdAt)}
                </span>
              </div>
              <p className="text-text-primary text-[13px] leading-snug break-words whitespace-pre-wrap">
                {renderBody(m.body, m.mentions, `msg-${m.id}`)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* reply composer */}
      <div className="border-border-primary border-t px-3 py-2.5">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <MentionTextarea
              key={replyKey}
              className="bg-input-bg border-input-border text-text-primary focus:border-input-focus-border w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none"
              placeholder={`Reply to ${opener.author.split(" ")[0]}…`}
              rows={2}
              onSubmit={send}
              onTextChange={setReply}
              onMention={(u) =>
                setMentioned((prev) =>
                  prev.some((p) => p.id === u.id) ? prev : [...prev, u]
                )
              }
            />
          </div>
          <button
            aria-label="Send reply"
            className="bg-primary hover:bg-primary-dark flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!reply.trim()}
            type="button"
            onClick={send}
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* actions */}
      <div className="border-border-primary flex items-center gap-1 border-t px-2.5 py-1.5">
        {!thread.resolved && (
          <button
            className="text-text-secondary hover:bg-success/10 hover:text-success flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            type="button"
            onClick={() => setThreadResolved(thread.id, true, myId, me)}
          >
            <Check size={13} />
            Resolve
          </button>
        )}
        {canDelete ? (
          <button
            className="text-text-tertiary hover:bg-error/10 hover:text-error ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
            type="button"
            onClick={() => {
              removeThread(thread.id);
              setActiveThreadId(null);
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Composer card for a freshly dropped pin (first message)                  */
/* ──────────────────────────────────────────────────────────────────────── */
const ComposerCard = ({
  lngLat,
  projectId,
  projectName,
}: {
  lngLat: [number, number];
  projectId?: string;
  projectName?: string;
}) => {
  const { user } = useAuth();
  const addThread = useMapEditor((s) => s.addThread);
  const setPendingCommentLocation = useMapEditor(
    (s) => s.setPendingCommentLocation
  );
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<PeopleSearchResult[]>([]);
  const [composerKey, setComposerKey] = useState(0); // bump ⇒ clear the editor

  const me = user?.full_name || user?.email || "You";
  const myId = user?.id ?? "";

  function post() {
    const text = body.trim();
    if (!text) return;
    addThread(lngLat, text, me, myId, toMentions(mentioned));
    notifyMentioned(mentioned, text, me, myId, projectId, projectName, lngLat);
    setBody("");
    setMentioned([]);
    setComposerKey((k) => k + 1);
  }

  return (
    <div className="bg-elevated border-border-primary animate-fade-in-up overflow-hidden rounded-2xl border shadow-2xl">
      <div className="border-border-primary flex items-center gap-2.5 border-b px-3.5 py-2.5">
        <Avatar
          name={me}
          size={28}
        />
        <div className="min-w-0 flex-1">
          <p className="text-text-primary truncate text-[13px] font-semibold">
            {me}
          </p>
          <p className="text-text-tertiary text-[11px]">New comment</p>
        </div>
        <button
          aria-label="Cancel comment"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={() => setPendingCommentLocation(null)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <MentionTextarea
          key={composerKey}
          autoFocus
          className="bg-input-bg border-input-border text-text-primary focus:border-input-focus-border w-full rounded-lg border px-3 py-2 text-[13px] focus:outline-none"
          placeholder="What would you like to say about this spot?"
          rows={3}
          onSubmit={post}
          onTextChange={setBody}
          onMention={(u) =>
            setMentioned((prev) =>
              prev.some((p) => p.id === u.id) ? prev : [...prev, u]
            )
          }
        />
      </div>
      <div className="border-border-primary flex items-center justify-end gap-2 border-t px-3 py-2">
        <button
          className="text-text-secondary hover:bg-surface-hover rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          type="button"
          onClick={() => setPendingCommentLocation(null)}
        >
          Cancel
        </button>
        <button
          className="bg-primary hover:bg-primary-dark flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!body.trim()}
          type="button"
          onClick={post}
        >
          <Send size={12} />
          Post
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/*  Overlay: a pin per thread + the open card / composer                     */
/* ──────────────────────────────────────────────────────────────────────── */
export const CommentPins = ({
  mapRef,
  mapReady,
  projectId,
  projectName,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
  projectId?: string;
  projectName?: string;
}) => {
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
      const place = (el: HTMLDivElement | null, lngLat: [number, number]) => {
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
            Math.min(pt.y - 180, Math.max(64, h - 420))
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
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
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
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
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
            active={t.id === activeThreadId}
            author={t.messages[0].author}
            resolved={t.resolved}
            onClick={() => setActiveThreadId(t.id)}
          />
        </div>
      ))}

      {/* pending pin (awaiting its first message) */}
      {pending ? (
        <div
          ref={(el) => {
            pinRefs.current["__pending"] = el;
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <CommentPin
            active
            author={me}
            resolved={false}
          />
        </div>
      ) : null}

      {/* ghost preview while placing (hidden until the cursor moves) */}
      {placing && !pending ? (
        <div
          ref={ghostRef}
          className="pointer-events-none absolute top-0 left-0 will-change-transform"
          style={{ transform: "translate(-50%, -100%)", opacity: 0 }}
        >
          <CommentPin
            ghost
            author={me}
            resolved={false}
          />
        </div>
      ) : null}

      {/* open card: thread or composer (one at a time) */}
      {activeThread || pending ? (
        <div
          ref={cardRef}
          /* NOTE: the outer container is `pointer-events-none` (an inherited
             property) - without this explicit `auto`, the whole card,
             including the textarea and its buttons, would be unclickable. */
          className="pointer-events-auto absolute top-0 left-0"
          style={{ width: CARD_W, visibility: "hidden" }}
        >
          {activeThread ? (
            <ThreadCard
              projectId={projectId}
              projectName={projectName}
              thread={activeThread}
            />
          ) : (
            pending && (
              <ComposerCard
                lngLat={pending}
                projectId={projectId}
                projectName={projectName}
              />
            )
          )}
        </div>
      ) : null}
    </div>
  );
};

export default CommentPins;

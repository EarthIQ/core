/**
 * Notification Center (core) — /notifications.
 *
 * Full list of the user's notifications with:
 *   • live unread count + connection status (WebSocket)
 *   • filter: all / unread / by category
 *   • text search
 *   • mark (all) read, mark unread, delete
 *   • infinite "load more" paging
 *   • deep links (each notification can carry a `link` payload)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  NOTIFICATION_CATEGORIES,
  useNotifications,
  type AppNotification,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/format";

const KIND_DOT: Record<string, string> = {
  info: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
};

function NotificationRow({
  n,
  onOpen,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const { markRead, markUnread, remove } = useNotifications();
  return (
    <div
      className={`group p-4 rounded-xl border transition-all cursor-pointer ${
        n.read
          ? "border-border-secondary hover:bg-surface-hover"
          : "border-primary/30 bg-primary/[0.04] hover:bg-surface-hover"
      }`}
      onClick={() => {
        if (!n.read) markRead(n.id);
        if (n.link && n.link.startsWith("/")) onOpen(n);
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: KIND_DOT[n.kind] ?? "var(--primary)" }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {!n.read && (
              <span className="badge badge-primary !px-1.5 !py-0 text-[0.6rem]">NEW</span>
            )}
            <span className="text-sm font-semibold text-text-primary">{n.title}</span>
            {n.source && (
              <span className="text-[0.65rem] text-text-tertiary uppercase tracking-wide">
                {n.source}
              </span>
            )}
          </div>
          {n.body && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{n.body}</p>
          )}
          <div className="text-[0.65rem] text-text-tertiary mt-1.5 flex items-center gap-2">
            <span>{timeAgo(n.created_at)}</span>
            {n.link && <span className="text-primary group-hover:underline">open →</span>}
          </div>
        </div>
        <div
          className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="btn btn-ghost btn-icon btn-sm"
            title={n.read ? "Mark as unread" : "Mark as read"}
            onClick={() => (n.read ? markUnread(n.id) : markRead(n.id))}
          >
            {n.read ? "◌" : "✓"}
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-error"
            title="Delete"
            onClick={() => remove(n.id)}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

type Filter = "all" | "unread" | string; // "all" | "unread" | <category>

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    items,
    unread,
    total,
    page,
    total_pages,
    loading,
    connected,
    loadMore,
    markAllRead,
    refresh,
  } = useNotifications();

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (filter === "unread" && n.read) return false;
      if (filter !== "all" && filter !== "unread" && n.category !== filter) return false;
      if (q && !`${n.title} ${n.body ?? ""} ${n.source ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, filter, search]);

  const FILTERS: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    ...NOTIFICATION_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  ];

  const countFor = (f: string) =>
    f === "all" ? total : f === "unread" ? unread : items.filter((n) => n.category === f).length;

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-elevated border-b border-border-primary backdrop-blur">
        <div className="px-6 pt-5 pb-3 max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
              Notifications
              <span
                className={`text-[0.6rem] px-2 py-0.5 rounded-full border ${
                  connected
                    ? "bg-success-subtle text-success border-success/20"
                    : "bg-error-subtle text-error border-error/20"
                }`}
                title={connected ? "Live updates connected" : "Live updates offline"}
              >
                {connected ? "● live" : "○ offline"}
              </span>
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {unread > 0
                ? `${unread} unread · ${total} total`
                : `All caught up · ${total} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={refresh} title="Refresh now">
              ↻
            </button>
            {unread > 0 && (
              <button className="btn btn-primary btn-sm" onClick={markAllRead}>
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* ── Filters + search ── */}
        <div className="px-6 max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                filter === f.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border-secondary text-text-secondary hover:bg-surface-hover"
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{countFor(f.id)}</span>
            </button>
          ))}
          <div className="relative flex-1 min-w-[10rem] ml-auto">
            <input
              className="input"
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div className="p-6 max-w-4xl mx-auto flex flex-col gap-2">
        {loading && items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-text-secondary">
            Loading notifications…
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-3xl mb-3">🔕</div>
            <div className="text-sm font-semibold text-text-primary">
              {search || filter !== "all"
                ? "No notifications match your filter"
                : "You're all caught up"}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              {search || filter !== "all"
                ? "Try a different search or category."
                : "New alerts, mentions and updates will appear here."}
            </div>
            {(search || filter !== "all") && (
              <button
                className="btn btn-ghost btn-sm mt-4"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {visible.map((n) => (
              <NotificationRow key={n.id} n={n} onOpen={(x) => x.link && navigate(x.link)} />
            ))}
            {page < total_pages && (
              <button
                className="btn btn-ghost btn-sm mt-2"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Loading…" : `Load more (${total - items.length} older)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
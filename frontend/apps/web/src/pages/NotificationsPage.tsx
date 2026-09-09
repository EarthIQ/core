/**
 * Notification Center (core) - /notifications.
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

import { timeAgo } from "@/lib/format";
import {
  NOTIFICATION_CATEGORIES,
  useNotifications,
  type AppNotification,
} from "@/lib/notifications";

const KIND_DOT: Record<string, string> = {
  info: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
};

const NotificationRow = ({
  n,
  onOpen,
}: {
  n: AppNotification;
  onOpen: (n: AppNotification) => void;
}) => {
  const { markRead, markUnread, remove } = useNotifications();
  return (
    <div
      className={`group cursor-pointer rounded-xl border p-4 transition-all ${
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
          aria-hidden
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: KIND_DOT[n.kind] ?? "var(--primary)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!n.read && (
              <span className="badge badge-primary !px-1.5 !py-0 text-[0.6rem]">
                NEW
              </span>
            )}
            <span className="text-text-primary text-sm font-semibold">
              {n.title}
            </span>
            {n.source ? (
              <span className="text-text-tertiary text-[0.65rem] tracking-wide uppercase">
                {n.source}
              </span>
            ) : null}
          </div>
          {n.body ? (
            <p className="text-text-secondary mt-1 line-clamp-2 text-xs">
              {n.body}
            </p>
          ) : null}
          <div className="text-text-tertiary mt-1.5 flex items-center gap-2 text-[0.65rem]">
            <span>{timeAgo(n.created_at)}</span>
            {n.link ? (
              <span className="text-primary group-hover:underline">open →</span>
            ) : null}
          </div>
        </div>
        <div
          className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100"
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
};

type Filter = string; // "all" | "unread" | <category>

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
      if (filter !== "all" && filter !== "unread" && n.category !== filter)
        return false;
      if (
        q &&
        !`${n.title} ${n.body ?? ""} ${n.source ?? ""}`
          .toLowerCase()
          .includes(q)
      )
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
    f === "all"
      ? total
      : f === "unread"
        ? unread
        : items.filter((n) => n.category === f).length;

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <div className="bg-elevated border-border-primary sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h1 className="text-text-primary flex items-center gap-2 text-lg font-bold">
              Notifications
              <span
                title={
                  connected ? "Live updates connected" : "Live updates offline"
                }
                className={`rounded-full border px-2 py-0.5 text-[0.6rem] ${
                  connected
                    ? "bg-success-subtle text-success border-success/20"
                    : "bg-error-subtle text-error border-error/20"
                }`}
              >
                {connected ? "● live" : "○ offline"}
              </span>
            </h1>
            <p className="text-text-secondary mt-0.5 text-xs">
              {unread > 0
                ? `${unread} unread · ${total} total`
                : `All caught up · ${total} total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              title="Refresh now"
              onClick={refresh}
            >
              ↻
            </button>
            {unread > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={markAllRead}
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* ── Filters + search ── */}
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-6 pb-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
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
          <div className="relative ml-auto min-w-[10rem] flex-1">
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
      <div className="mx-auto flex max-w-4xl flex-col gap-2 p-6">
        {loading && items.length === 0 ? (
          <div className="card text-text-secondary p-8 text-center text-sm">
            Loading notifications…
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="mb-3 text-3xl">🔕</div>
            <div className="text-text-primary text-sm font-semibold">
              {search || filter !== "all"
                ? "No notifications match your filter"
                : "You're all caught up"}
            </div>
            <div className="text-text-secondary mt-1 text-xs">
              {search || filter !== "all"
                ? "Try a different search or category."
                : "New alerts, mentions and updates will appear here."}
            </div>
            {search || filter !== "all" ? (
              <button
                className="btn btn-ghost btn-sm mt-4"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {visible.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onOpen={(x) => x.link && navigate(x.link)}
              />
            ))}
            {page < total_pages && (
              <button
                className="btn btn-ghost btn-sm mt-2"
                disabled={loading}
                onClick={loadMore}
              >
                {loading
                  ? "Loading…"
                  : `Load more (${total - items.length} older)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

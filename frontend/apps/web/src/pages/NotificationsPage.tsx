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
import {
  Check,
  CheckCheck,
  Circle,
  Inbox,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            aria-label={n.read ? "Mark as unread" : "Mark as read"}
            className="btn btn-ghost btn-icon btn-sm"
            title={n.read ? "Mark as unread" : "Mark as read"}
            onClick={() => (n.read ? markUnread(n.id) : markRead(n.id))}
          >
            {n.read ? <Circle size={15} /> : <Check size={15} />}
          </button>
          <button
            aria-label="Delete notification"
            className="btn btn-ghost btn-icon btn-sm text-text-tertiary hover:text-error"
            title="Delete"
            onClick={() => remove(n.id)}
          >
            <Trash2 size={15} />
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
  const [showFilters, setShowFilters] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(ev.target as Node))
        setShowFilters(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Label + state for the compact toolbar's Filter button.
  const activeLabel =
    filter === "all"
      ? "All"
      : filter === "unread"
        ? "Unread"
        : (NOTIFICATION_CATEGORIES.find((c) => c.id === filter)?.label ??
          "Filter");
  const hasActiveFilter = filter !== "all" || search.trim() !== "";

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

  const countFor = (f: string) =>
    f === "all"
      ? total
      : f === "unread"
        ? unread
        : items.filter((n) => n.category === f).length;

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
      <div className="border-border-primary bg-elevated sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3">
          {/* Title + status */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-text-primary text-base font-bold">
                Notifications
              </h1>
              <span
                className={`rounded-full border px-2 py-0.5 text-[0.6rem] ${
                  connected
                    ? "border-success/20 bg-success-subtle text-success"
                    : "border-error/20 bg-error-subtle text-error"
                }`}
                title={
                  connected ? "Live updates connected" : "Live updates offline"
                }
              >
                {connected ? "live" : "offline"}
              </span>
            </div>
            <p className="text-text-secondary text-xs">
              {unread > 0 ? `${unread} unread` : "All caught up"} · {total}{" "}
              total
            </p>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Filter — hides the rarely-used categories + search behind it */}
            <div
              ref={filterRef}
              className="relative"
            >
              <button
                aria-expanded={showFilters}
                title="Filter and search"
                className={`btn btn-sm ${
                  hasActiveFilter ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal
                  className="mr-1.5"
                  size={15}
                />
                {activeLabel}
              </button>

              {showFilters ? (
                <div className="bg-elevated border-border-primary animate-fade-in-up absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border shadow-xl">
                  {/* Search */}
                  <div className="border-border-secondary border-b p-3">
                    <div className="relative">
                      <Search
                        className="text-text-tertiary pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                        size={14}
                      />
                      <input
                        className="input"
                        placeholder="Search notifications…"
                        style={{ paddingLeft: "2.1rem" }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search ? (
                        <button
                          aria-label="Clear search"
                          className="text-text-tertiary hover:text-text-primary absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
                          onClick={() => setSearch("")}
                        >
                          <X size={13} />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Views */}
                  <div className="py-1">
                    <div className="text-text-tertiary px-3 pt-2 pb-1 text-[0.6rem] font-bold tracking-widest uppercase">
                      View
                    </div>
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "unread", label: "Unread" },
                      ] as { id: Filter; label: string }[]
                    ).map((v) => (
                      <button
                        key={v.id}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors ${
                          filter === v.id
                            ? "bg-primary/10 text-primary"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}
                        onClick={() => {
                          setFilter(v.id);
                          setShowFilters(false);
                        }}
                      >
                        <span>{v.label}</span>
                        <span className="opacity-70">{countFor(v.id)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Categories */}
                  <div className="border-border-secondary border-t py-1">
                    <div className="text-text-tertiary px-3 pt-2 pb-1 text-[0.6rem] font-bold tracking-widest uppercase">
                      Category
                    </div>
                    {NOTIFICATION_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors ${
                          filter === c.id
                            ? "bg-primary/10 text-primary"
                            : "text-text-secondary hover:bg-surface-hover"
                        }`}
                        onClick={() => {
                          setFilter(c.id);
                          setShowFilters(false);
                        }}
                      >
                        <span className="truncate">{c.label}</span>
                        <span className="shrink-0 opacity-70">
                          {countFor(c.id)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Reset */}
                  <div className="border-border-secondary border-t">
                    <button
                      className="text-primary w-full cursor-pointer py-2 text-center text-xs font-medium hover:underline"
                      onClick={() => {
                        setFilter("all");
                        setSearch("");
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              aria-label="Refresh notifications"
              className="btn btn-ghost btn-icon btn-sm"
              title="Refresh now"
              onClick={refresh}
            >
              <RefreshCw size={15} />
            </button>

            {unread > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={markAllRead}
              >
                <CheckCheck
                  className="mr-1.5"
                  size={15}
                />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* ── Active filter chip ── */}
        {hasActiveFilter ? (
          <div className="border-border-secondary border-t">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-6 py-2 text-xs">
              <span className="text-text-secondary">Showing</span>
              <span className="badge badge-primary">{activeLabel}</span>
              {search.trim() && <span className="badge">“{search}”</span>}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                <X
                  className="mr-1"
                  size={12}
                />
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── List ── */}
      <div className="mx-auto flex max-w-5xl flex-col gap-2 p-6">
        {loading && items.length === 0 ? (
          <div className="card text-text-secondary p-8 text-center text-sm">
            Loading notifications…
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="bg-surface-hover mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
              <Inbox
                className="text-text-tertiary"
                size={22}
              />
            </div>
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

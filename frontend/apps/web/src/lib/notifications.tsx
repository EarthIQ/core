/**
 * Notifications — live in-app notification hub (core).
 *
 * Backed by the core notifications API:
 *   • REST  ``/api/notifications*`` (list, counts, read state, preferences)
 *   • WS    ``/api/notifications/stream?token=…`` (push new notifications)
 *
 * The provider keeps the recent notification window, the live unread count,
 * per-user delivery preferences, and a small toast stack (rendered for every
 * consumer). It reconnects with backoff and pauses when the session is dead
 * (401) until ``refresh()`` is called.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./auth";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string; // recipient id (per-user row) — use for read/unread/delete
  message_id: string;
  category: string;
  kind: "info" | "success" | "warning" | "error" | string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  source: string | null;
  link: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPrefs {
  enabled: boolean;
  categories: Record<string, boolean>;
  toasts: boolean;
  sound: boolean;
  updated_at: string | null;
}

export const NOTIFICATION_CATEGORIES: { id: string; label: string }[] = [
  { id: "system", label: "System & announcements" },
  { id: "project", label: "Projects & access requests" },
  { id: "dataset", label: "Datasets & data changes" },
  { id: "access_request", label: "Access requests" },
  { id: "ai", label: "AI results & jobs" },
  { id: "mention", label: "Mentions" },
];

export interface NotificationToast {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  link: string | null;
}

interface NotificationsContextValue {
  items: AppNotification[];
  unread: number;
  total: number;
  total_pages: number;
  page: number;
  loading: boolean;
  connected: boolean;
  prefs: NotificationPrefs | null;
  toasts: NotificationToast[];
  // data
  refresh: () => void;
  loadMore: () => void;
  // actions
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  // preferences
  updatePrefs: (partial: Partial<NotificationPrefs>) => void;
  // toasts
  dismissToast: (id: string) => void;
  // session
  stop: () => void;
}

const PAGE_SIZE = 30;

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unread: 0,
  total: 0,
  total_pages: 1,
  page: 1,
  loading: false,
  connected: false,
  prefs: null,
  toasts: [],
  refresh: () => {},
  loadMore: () => {},
  markRead: () => {},
  markUnread: () => {},
  markAllRead: () => {},
  remove: () => {},
  updatePrefs: () => {},
  dismissToast: () => {},
  stop: () => {},
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/** WebSocket URL for a core API path (same origin or VITE_API_URL origin). */
function wsUrl(path: string): string {
  const token = localStorage.getItem("eq_token") ?? "";
  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  let base: string;
  if (apiBase) {
    base = apiBase.replace(/^http/i, "ws");
  } else {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    base = `${proto}://${window.location.host}`;
  }
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const deadRef = useRef(false); // true when session died (401) — stop reconnecting
  const prefsRef = useRef<NotificationPrefs | null>(null);
  prefsRef.current = prefs;

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // ── REST helpers ─────────────────────────────────────────────────────────────

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    try {
      const qs = `page=${targetPage}&page_size=${PAGE_SIZE}`;
      const data = await api.get<{
        items: AppNotification[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`/api/notifications?${qs}`);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(data.page);
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    deadRef.current = false;
    if (!isAuthenticated) return;
    await Promise.all([
      loadPage(1, false),
      api
        .get<{ unread: number }>("/api/notifications/unread-count")
        .then((r) => setUnread(r.unread))
        .catch(() => {}),
      api
        .get<NotificationPrefs>("/api/notifications/preferences")
        .then(setPrefs)
        .catch(() => {}),
    ]);
  }, [isAuthenticated, loadPage]);

  // Initial load + on login.
  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnread(0);
      setPrefs(null);
      return;
    }
    refresh();
  }, [isAuthenticated, user?.id, refresh]);
  // ── Live WebSocket stream ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let ping: ReturnType<typeof setInterval> | null = null;
    let attempt = 0;

    function connect() {
      if (closed || deadRef.current) return;
      ws = new WebSocket(wsUrl("/api/notifications/stream"));
      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        ping = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25000);
      };
      ws.onmessage = (ev) => {
        let msg: {
          type?: string;
          notification?: AppNotification;
          unread_count?: number;
        };
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.type === "notification:new" && msg.notification) {
          const n = msg.notification;
          setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
          setUnread((u) =>
            typeof msg.unread_count === "number" ? msg.unread_count : u + (n.read ? 0 : 1),
          );
          setTotal((t) => t + 1);
          const p = prefsRef.current;
          if (p?.toasts) {
            const toast: NotificationToast = {
              id: `t-${n.id}-${Date.now()}`,
              title: n.title,
              body: n.body,
              kind: n.kind,
              link: n.link,
            };
            setToasts((t) => [...t.slice(-3), toast]);
            setTimeout(() => dismissToast(toast.id), 6000);
          }
          if (p?.sound) beep();
        }
      };
      ws.onclose = (ev) => {
        setConnected(false);
        if (ping) clearInterval(ping);
        if (closed) return;
        // 1008 = auth failed → don't hammer the server with a bad token.
        if (ev.code === 1008) {
          deadRef.current = true;
          return;
        }
        const backoff = Math.min(30000, 1000 * 2 ** attempt);
        attempt += 1;
        retry = setTimeout(connect, backoff);
      };
      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !closed && !deadRef.current) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (ping) clearInterval(ping);
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    };
  }, [isAuthenticated, user?.id, refresh, dismissToast]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    api.post(`/api/notifications/${id}/read`).catch(() => {});
  }, []);

  const markUnread = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    setUnread((u) => u + 1);
    api.post(`/api/notifications/${id}/unread`).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    api.post<{ marked: number }>("/api/notifications/read-all").catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((n) => n.id === id);
      if (gone && !gone.read) setUnread((u) => Math.max(0, u - 1));
      return prev.filter((n) => n.id !== id);
    });
    setTotal((t) => Math.max(0, t - 1));
    api.delete(`/api/notifications/${id}`).catch(() => {});
  }, []);

  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) loadPage(page + 1, true);
  }, [page, totalPages, loading, loadPage]);

  const updatePrefs = useCallback((partial: Partial<NotificationPrefs>) => {
    setPrefs((p) => ({
      enabled: p?.enabled ?? true,
      categories: { ...(p?.categories ?? {}), ...(partial.categories ?? {}) },
      toasts: p?.toasts ?? true,
      sound: p?.sound ?? false,
      updated_at: p?.updated_at ?? null,
      ...partial,
    }));
    api.put("/api/notifications/preferences", partial).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    deadRef.current = true;
  }, []);

  const value = useMemo(
    () => ({
      items,
      unread,
      total,
      total_pages: totalPages,
      page,
      loading,
      connected,
      prefs,
      toasts,
      refresh,
      loadMore,
      markRead,
      markUnread,
      markAllRead,
      remove,
      updatePrefs,
      dismissToast,
      stop,
    }),
    [
      items,
      unread,
      total,
      totalPages,
      page,
      loading,
      connected,
      prefs,
      toasts,
      refresh,
      loadMore,
      markRead,
      markUnread,
      markAllRead,
      remove,
      updatePrefs,
      dismissToast,
      stop,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onOpen={(t) => {
          dismissToast(t.id);
          if (t.link && t.link.startsWith("/")) navigate(t.link);
          else navigate("/notifications");
        }}
      />
    </NotificationsContext.Provider>
  );
}

// ── Sound ──────────────────────────────────────────────────────────────────────

/** A short, soft "ding" for new notifications. */
function beep(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    osc.onended = () => ctx.close();
  } catch {
    /* audio unavailable — ignore */
  }
}

// ── Toast stack ────────────────────────────────────────────────────────────────

const KIND_ICON: Record<string, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "⛔",
};

function ToastStack({
  toasts,
  onDismiss,
  onOpen,
}: {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
  onOpen: (t: NotificationToast) => void;
}) {
  if (!toasts.length) return null;
  return createPortal(
    <div
      className="fixed top-4 right-4 z-[999] flex flex-col gap-2 w-[min(92vw,22rem)]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card p-3 flex items-start gap-3 animate-slide-in-right cursor-pointer"
          onClick={() => onOpen(t)}
        >
          <span className="text-base leading-none mt-0.5">{KIND_ICON[t.kind] ?? "🔔"}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">{t.title}</div>
            {t.body && (
              <div className="text-xs text-text-secondary mt-0.5 line-clamp-2">{t.body}</div>
            )}
            <div className="text-[0.65rem] text-text-tertiary mt-1">click to view</div>
          </div>
          <button
            className="text-text-tertiary hover:text-text-primary text-xs cursor-pointer shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(t.id);
            }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
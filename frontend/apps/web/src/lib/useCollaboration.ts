/**
 * useCollaboration
 *
 * Manages a WebSocket connection to the backend collaboration endpoint
 * for a given project. Tracks all other active collaborators in real-time.
 *
 * Usage:
 *   const { collaborators, isConnected, sendCursor } = useCollaboration(projectId, mapRef);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type maplibregl from "maplibre-gl";

const TOKEN_KEY = "eq_token";
const THROTTLE_MS = 100; // max 10 cursor updates/sec

export interface CollaboratorState {
  user_id: string;
  email: string;
  full_name: string | null;
  cursor: { lng: number; lat: number } | null;
  viewport: { zoom: number; center: { lng: number; lat: number } } | null;
}

interface UseCollaborationResult {
  collaborators: CollaboratorState[];
  isConnected: boolean;
  sendPresence: (cursor: { lng: number; lat: number } | null, viewport?: { zoom: number } | null) => void;
}

export function useCollaboration(
  projectId: string | null,
  mapRef: MutableRefObject<maplibregl.Map | null>
): UseCollaborationResult {
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSendRef = useRef<number>(0);

  // ── Send presence update (throttled) ────────────────────────────────────────
  const sendPresence = useCallback(
    (
      cursor: { lng: number; lat: number } | null,
      viewport?: { zoom: number } | null
    ) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      if (now - lastSendRef.current < THROTTLE_MS) return;
      lastSendRef.current = now;

      const map = mapRef.current;
      const center = map?.getCenter();
      const zoom = map?.getZoom();

      ws.send(
        JSON.stringify({
          type: "presence",
          cursor,
          viewport:
            center && zoom != null
              ? { zoom, center: { lng: center.lng, lat: center.lat } }
              : viewport ?? null,
        })
      );
    },
    [mapRef]
  );

  // ── WebSocket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // Build WS URL: ws(s)://host/api/collab/ws/{projectId}?token=...
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host;
    const url = `${proto}://${host}/api/collab/ws/${projectId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setCollaborators([]);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        handleServerMessage(msg);
      } catch {
        // ignore malformed
      }
    };

    function handleServerMessage(msg: {
      type: string;
      collaborators?: CollaboratorState[];
      user_id?: string;
      email?: string;
      full_name?: string | null;
      cursor?: { lng: number; lat: number } | null;
      viewport?: { zoom: number; center: { lng: number; lat: number } } | null;
    }) {
      switch (msg.type) {
        case "snapshot":
          setCollaborators(msg.collaborators ?? []);
          break;

        case "join":
          setCollaborators((prev) => {
            if (prev.find((c) => c.user_id === msg.user_id)) return prev;
            return [
              ...prev,
              {
                user_id: msg.user_id!,
                email: msg.email!,
                full_name: msg.full_name ?? null,
                cursor: null,
                viewport: null,
              },
            ];
          });
          break;

        case "leave":
          setCollaborators((prev) =>
            prev.filter((c) => c.user_id !== msg.user_id)
          );
          break;

        case "presence":
          setCollaborators((prev) =>
            prev.map((c) =>
              c.user_id === msg.user_id
                ? {
                    ...c,
                    cursor: msg.cursor ?? c.cursor,
                    viewport: msg.viewport ?? c.viewport,
                  }
                : c
            )
          );
          break;
      }
    }

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [projectId]);

  // ── Map event listeners: send cursor + viewport on move ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isConnected) return;

    const onMouseMove = (e: { lngLat: { lng: number; lat: number } }) => {
      sendPresence({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    const onMouseLeave = () => {
      sendPresence(null);
    };

    const onMoveEnd = () => {
      sendPresence(null);
    };

    map.on("mousemove", onMouseMove);
    map.on("mouseout", onMouseLeave);
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseLeave);
      map.off("moveend", onMoveEnd);
    };
  }, [mapRef, isConnected, sendPresence]);

  return { collaborators, isConnected, sendPresence };
}

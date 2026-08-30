import { create } from "zustand";
import type {
  ActiveTool,
  Annotation,
  AnnotationKind,
  Bookmark,
  CommentMessage,
  CommentThread,
  DrawnFeature,
  DrawSession,
  PointAnnotation,
  ShapeAnnotation,
} from "./types";
import { POINT_KINDS } from "./types";

/* ──────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */
let idCounter = 0;
function uid(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** Default styling for a freshly placed annotation of a given kind. */
export function defaultAnnotationFor(
  kind: AnnotationKind,
  seed: { lngLat?: [number, number]; radius?: number; color?: string },
): Annotation {
  const base = {
    id: uid("ann"),
    kind,
    color: seed.color ?? "#50aad1",
  };

  if ((POINT_KINDS as AnnotationKind[]).includes(kind)) {
    return {
      ...base,
      lngLat: seed.lngLat ?? [0, 0],
      kind,
    } as PointAnnotation;
  }

  return {
    ...base,
    kind,
    geometry: { type: "Point", coordinates: [0, 0] },
    radius: seed.radius ?? 100,
    opacity: 0.45,
    lineWidth: 4,
  } as ShapeAnnotation;
}

/**
 * Normalize persisted comment data into the threaded model.
 * Accepts the legacy flat format (`{ id, body, author, lngLat?, createdAt }`)
 * as well as the current `{ id, messages: [...], resolved, ... }` format,
 * so older projects keep working.
 */
function migrateComments(raw: unknown): CommentThread[] {
  if (!Array.isArray(raw)) return [];
  const out: CommentThread[] = [];
  const lngLat = (v: unknown): [number, number] | null =>
    Array.isArray(v) && v.length === 2 &&
    Number.isFinite(Number(v[0])) &&
    Number.isFinite(Number(v[1]))
      ? [Number(v[0]), Number(v[1])]
      : null;

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;

    if (Array.isArray(c.messages)) {
      // Current threaded format
      const messages: CommentMessage[] = (c.messages as any[])
        .filter((m) => m && typeof m.body === "string" && m.body.trim())
        .map((m) => ({
          id: typeof m.id === "string" ? m.id : uid("msg"),
          body: m.body,
          author: typeof m.author === "string" && m.author ? m.author : "Unknown",
          authorId: typeof m.authorId === "string" ? m.authorId : "",
          createdAt:
            typeof m.createdAt === "number" ? m.createdAt : Date.now(),
        }));
      if (messages.length === 0) continue;
      out.push({
        id: typeof c.id === "string" ? c.id : uid("cm"),
        lngLat: lngLat(c.lngLat),
        messages,
        resolved: !!c.resolved,
        resolvedById:
          typeof c.resolvedById === "string" ? c.resolvedById : undefined,
        resolvedByName:
          typeof c.resolvedByName === "string" ? c.resolvedByName : undefined,
        resolvedAt:
          typeof c.resolvedAt === "number" ? c.resolvedAt : undefined,
        createdAt:
          typeof c.createdAt === "number"
            ? c.createdAt
            : messages[0].createdAt,
        updatedAt:
          typeof c.updatedAt === "number"
            ? c.updatedAt
            : messages[messages.length - 1].createdAt,
      });
      continue;
    }

    // Legacy flat comment
    if (typeof c.body === "string" && c.body.trim()) {
      const createdAt =
        typeof c.createdAt === "number" ? c.createdAt : Date.now();
      out.push({
        id: typeof c.id === "string" ? c.id : uid("cm"),
        lngLat: lngLat(c.lngLat),
        messages: [
          {
            id: uid("msg"),
            body: c.body,
            author:
              typeof c.author === "string" && c.author ? c.author : "Unknown",
            authorId: typeof c.authorId === "string" ? c.authorId : "",
            createdAt,
          },
        ],
        resolved: !!c.resolved,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  State + actions                                                          */
/* ──────────────────────────────────────────────────────────────────────── */
interface Snapshot {
  annotations: Annotation[];
  bookmarks: Bookmark[];
  comments: CommentThread[];
  /** Committed TerraDraw shapes (undo/redo covers these too). */
  drawnFeatures: DrawnFeature[];
}

interface MapEditorState extends Snapshot {
  activeTool: ActiveTool | null;
  selectionId: string | null;
  pendingPointKind: AnnotationKind | null;
  pendingRadius: number | null;
  /** Active shape draw-session (create new layer / edit saved layer). */
  drawSession: DrawSession | null;
  past: Snapshot[];
  future: Snapshot[];
  bookmarkOpen: boolean;
  commentsOpen: boolean;
  /** Comment placement mode: the next map click drops a comment pin. */
  commentPlacement: boolean;
  /** A dropped pin waiting for its first message (composer open). */
  pendingCommentLocation: [number, number] | null;
  /** The thread whose card is currently open on the map. */
  activeThreadId: string | null;

  // tool + selection
  setActiveTool: (tool: ActiveTool | null) => void;
  setPendingPointKind: (kind: AnnotationKind | null) => void;
  setPendingRadius: (radius: number | null) => void;
  setSelectionId: (id: string | null) => void;

  // annotations (history-tracked)
  addAnnotation: (ann: Annotation) => void;
  updateAnnotation: (
    id: string,
    patch: Partial<PointAnnotation> & Partial<ShapeAnnotation>,
  ) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;

  // drawn features (TerraDraw engine)
  /** Update drawn features without a history entry (e.g. live edits). */
  syncDrawnFeatures: (features: DrawnFeature[]) => void;
  /** Update drawn features with a history entry (create / delete / restore). */
  commitDrawnFeatures: (features: DrawnFeature[]) => void;
  /** Remove all drawn features with a history entry. */
  clearDrawnFeatures: () => void;

  // draw-session (draw new layer / edit saved layer)
  /** Begin a shape session; resets the undo/redo history to a clean slate. */
  startDrawSession: (session: DrawSession) => void;
  /** End the shape session: clears features + history + session. */
  endDrawSession: () => void;

  // bookmarks (history-tracked)
  addBookmark: (
    name: string,
    view: {
      center: [number, number];
      zoom: number;
      bearing?: number;
      pitch?: number;
    },
  ) => void;
  removeBookmark: (id: string) => void;
  renameBookmark: (id: string, name: string) => void;

  // comments (history-tracked) — threaded, pinned discussions
  addThread: (
    lngLat: [number, number],
    body: string,
    author: string,
    authorId: string,
  ) => void;
  replyToThread: (
    threadId: string,
    body: string,
    author: string,
    authorId: string,
  ) => void;
  setThreadResolved: (
    threadId: string,
    resolved: boolean,
    resolvedById?: string,
    resolvedByName?: string,
  ) => void;
  removeThread: (threadId: string) => void;

  // history
  undo: () => void;
  redo: () => void;

  // panel toggles + comment placement flow
  setBookmarkOpen: (open: boolean) => void;
  setCommentsOpen: (open: boolean) => void;
  setCommentPlacement: (placing: boolean) => void;
  setPendingCommentLocation: (lngLat: [number, number] | null) => void;
  setActiveThreadId: (id: string | null) => void;

  // seed from a loaded project (no history entry)
  hydrate: (snap: Snapshot) => void;
}

function snapshot(s: MapEditorState): Snapshot {
  return {
    annotations: s.annotations,
    bookmarks: s.bookmarks,
    comments: s.comments,
    drawnFeatures: s.drawnFeatures,
  };
}

function pushHistory(state: MapEditorState): {
  past: Snapshot[];
  future: Snapshot[];
} {
  return { past: [...state.past.slice(-49), snapshot(state)], future: [] };
}

export const useMapEditor = create<MapEditorState>((set) => ({
  activeTool: null,
  selectionId: null,
  pendingPointKind: null,
  pendingRadius: null,
  annotations: [],
  bookmarks: [],
  comments: [],
  drawnFeatures: [],
  drawSession: null,
  past: [],
  future: [],
  bookmarkOpen: false,
  commentsOpen: false,
  commentPlacement: false,
  pendingCommentLocation: null,
  activeThreadId: null,

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      selectionId: null,
      pendingPointKind: null,
      pendingRadius: null,
    }),
  setPendingPointKind: (kind) => set({ pendingPointKind: kind }),
  setPendingRadius: (radius) => set({ pendingRadius: radius }),
  setSelectionId: (id) => set({ selectionId: id }),

  addAnnotation: (ann) =>
    set((s) => ({
      ...pushHistory(s),
      annotations: [...s.annotations, ann],
      selectionId: ann.id,
    })),

  updateAnnotation: (id, patch) =>
    set((s) => ({
      ...pushHistory(s),
      annotations: s.annotations.map((a) =>
        a.id === id ? ({ ...a, ...patch } as Annotation) : a,
      ),
    })),

  removeAnnotation: (id) =>
    set((s) => ({
      ...pushHistory(s),
      annotations: s.annotations.filter((a) => a.id !== id),
      selectionId: s.selectionId === id ? null : s.selectionId,
    })),

  clearAnnotations: () =>
    set((s) =>
      s.annotations.length
        ? { ...pushHistory(s), annotations: [], selectionId: null }
        : {},
    ),

  syncDrawnFeatures: (features) =>
    set((s) =>
      JSON.stringify(s.drawnFeatures) === JSON.stringify(features)
        ? {}
        : { drawnFeatures: features, selectionId: null },
    ),

  commitDrawnFeatures: (features) =>
    set((s) =>
      JSON.stringify(s.drawnFeatures) === JSON.stringify(features)
        ? {}
        : { ...pushHistory(s), drawnFeatures: features, selectionId: null },
    ),

  clearDrawnFeatures: () =>
    set((s) =>
      s.drawnFeatures.length
        ? { ...pushHistory(s), drawnFeatures: [], selectionId: null }
        : {},
    ),

  startDrawSession: (session) =>
    set({ drawSession: session, past: [], future: [], selectionId: null }),

  endDrawSession: () =>
    set({
      drawSession: null,
      drawnFeatures: [],
      past: [],
      future: [],
      selectionId: null,
    }),

  addBookmark: (name, view) =>
    set((s) => ({
      ...pushHistory(s),
      bookmarks: [
        ...s.bookmarks,
        {
          id: uid("bm"),
          name,
          center: view.center,
          zoom: view.zoom,
          bearing: view.bearing,
          pitch: view.pitch,
          createdAt: Date.now(),
        },
      ],
    })),

  removeBookmark: (id) =>
    set((s) => ({
      ...pushHistory(s),
      bookmarks: s.bookmarks.filter((b) => b.id !== id),
    })),

  renameBookmark: (id, name) =>
    set((s) => ({
      ...pushHistory(s),
      bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, name } : b)),
    })),

  addThread: (lngLat, body, author, authorId) =>
    set((s) => {
      const now = Date.now();
      const message = {
        id: uid("msg"),
        body,
        author,
        authorId,
        createdAt: now,
      };
      return {
        ...pushHistory(s),
        commentPlacement: false,
        pendingCommentLocation: null,
        activeThreadId: null,
        comments: [
          ...s.comments,
          {
            id: uid("cm"),
            lngLat,
            messages: [message],
            resolved: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    }),

  replyToThread: (threadId, body, author, authorId) =>
    set((s) => {
      const now = Date.now();
      return {
        ...pushHistory(s),
        comments: s.comments.map((c) =>
          c.id === threadId
            ? {
                ...c,
                updatedAt: now,
                messages: [
                  ...c.messages,
                  { id: uid("msg"), body, author, authorId, createdAt: now },
                ],
              }
            : c,
        ),
      };
    }),

  setThreadResolved: (threadId, resolved, resolvedById, resolvedByName) =>
    set((s) => ({
      ...pushHistory(s),
      comments: s.comments.map((c) =>
        c.id === threadId
          ? {
              ...c,
              resolved,
              resolvedAt: resolved ? Date.now() : undefined,
              resolvedById: resolved ? resolvedById : undefined,
              resolvedByName: resolved ? resolvedByName : undefined,
            }
          : c,
      ),
    })),

  removeThread: (threadId) =>
    set((s) => ({
      ...pushHistory(s),
      activeThreadId: s.activeThreadId === threadId ? null : s.activeThreadId,
      comments: s.comments.filter((c) => c.id !== threadId),
    })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, 50),
        ...prev,
        selectionId: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[0];
      return {
        past: [...s.past, snapshot(s)].slice(-50),
        future: s.future.slice(1),
        ...next,
        selectionId: null,
      };
    }),

  setBookmarkOpen: (open) => set({ bookmarkOpen: open }),
  setCommentsOpen: (open) => set({ commentsOpen: open }),
  setCommentPlacement: (placing) =>
    set(
      placing
        ? { commentPlacement: true, activeThreadId: null, commentsOpen: false }
        : { commentPlacement: false, pendingCommentLocation: null },
    ),
  setPendingCommentLocation: (lngLat) =>
    set({ pendingCommentLocation: lngLat, activeThreadId: null }),
  setActiveThreadId: (id) =>
    set({ activeThreadId: id, pendingCommentLocation: null }),

  hydrate: (snap) =>
    set({
      annotations: snap.annotations,
      bookmarks: snap.bookmarks,
      comments: migrateComments(snap.comments),
      drawnFeatures: snap.drawnFeatures ?? [],
      drawSession: null,
      past: [],
      future: [],
      selectionId: null,
      commentPlacement: false,
      pendingCommentLocation: null,
      activeThreadId: null,
    }),
}));

/** Convenience selector: the annotation currently selected. */
export function selectSelectedAnnotation(
  s: MapEditorState,
): Annotation | undefined {
  return s.annotations.find((a) => a.id === s.selectionId);
}

/** Whether a shape draw-session is active (drives Save/Undo/Redo buttons). */
export const selectSessionActive = (s: MapEditorState) =>
  s.drawSession !== null;

/** Whether undo is currently possible. */
export const selectCanUndo = (s: MapEditorState) => s.past.length > 0;
/** Whether redo is currently possible. */
export const selectCanRedo = (s: MapEditorState) => s.future.length > 0;

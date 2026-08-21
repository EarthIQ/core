import { create } from "zustand";
import type {
  ActiveTool,
  Annotation,
  AnnotationKind,
  Bookmark,
  CommentItem,
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

/* ──────────────────────────────────────────────────────────────────────── */
/*  State + actions                                                          */
/* ──────────────────────────────────────────────────────────────────────── */
interface Snapshot {
  annotations: Annotation[];
  bookmarks: Bookmark[];
  comments: CommentItem[];
}

interface MapEditorState extends Snapshot {
  activeTool: ActiveTool | null;
  selectionId: string | null;
  pendingPointKind: AnnotationKind | null;
  pendingRadius: number | null;
  past: Snapshot[];
  future: Snapshot[];
  bookmarkOpen: boolean;
  commentsOpen: boolean;

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

  // comments (history-tracked)
  addComment: (body: string, author: string, lngLat?: [number, number]) => void;
  removeComment: (id: string) => void;

  // history
  undo: () => void;
  redo: () => void;

  // panel toggles
  setBookmarkOpen: (open: boolean) => void;
  setCommentsOpen: (open: boolean) => void;

  // seed from a loaded project (no history entry)
  hydrate: (snap: Snapshot) => void;
}

function snapshot(s: MapEditorState): Snapshot {
  return {
    annotations: s.annotations,
    bookmarks: s.bookmarks,
    comments: s.comments,
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
  past: [],
  future: [],
  bookmarkOpen: false,
  commentsOpen: false,

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

  addComment: (body, author, lngLat) =>
    set((s) => ({
      ...pushHistory(s),
      comments: [
        ...s.comments,
        { id: uid("cm"), body, author, lngLat, createdAt: Date.now() },
      ],
    })),

  removeComment: (id) =>
    set((s) => ({
      ...pushHistory(s),
      comments: s.comments.filter((c) => c.id !== id),
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

  hydrate: (snap) =>
    set({
      annotations: snap.annotations,
      bookmarks: snap.bookmarks,
      comments: snap.comments,
      past: [],
      future: [],
      selectionId: null,
    }),
}));

/** Convenience selector: the annotation currently selected. */
export function selectSelectedAnnotation(
  s: MapEditorState,
): Annotation | undefined {
  return s.annotations.find((a) => a.id === s.selectionId);
}

/** Whether undo is currently possible. */
export const selectCanUndo = (s: MapEditorState) => s.past.length > 0;
/** Whether redo is currently possible. */
export const selectCanRedo = (s: MapEditorState) => s.future.length > 0;

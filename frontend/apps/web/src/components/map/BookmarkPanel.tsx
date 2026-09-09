import { Bookmark, Crosshair, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { useMapEditor } from "@/lib/mapEditor/store";

export const BookmarkPanel = ({
  mapRef,
  _mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) => {
  const open = useMapEditor((s) => s.bookmarkOpen);
  const setOpen = useMapEditor((s) => s.setBookmarkOpen);
  const bookmarks = useMapEditor((s) => s.bookmarks);
  const addBookmark = useMapEditor((s) => s.addBookmark);
  const removeBookmark = useMapEditor((s) => s.removeBookmark);
  const renameBookmark = useMapEditor((s) => s.renameBookmark);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  if (!open) return null;

  function handleAdd() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const name = newName.trim() || `Bookmark ${bookmarks.length + 1}`;
    addBookmark(name, {
      center: [c.lng, c.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing?.(),
      pitch: map.getPitch?.(),
    });
    setNewName("");
  }

  function handleJump(id: string) {
    const bm = bookmarks.find((b) => b.id === id);
    const map = mapRef.current;
    if (!bm || !map) return;
    map.flyTo({
      center: bm.center,
      zoom: bm.zoom,
      bearing: bm.bearing,
      pitch: bm.pitch,
    });
  }

  function startRename(id: string, current: string) {
    setRenamingId(id);
    setDraftName(current);
  }

  function commitRename(id: string) {
    const name = draftName.trim();
    if (name) renameBookmark(id, name);
    setRenamingId(null);
  }

  return (
    <div className="bg-elevated border-border-primary animate-fade-in-up absolute right-3 bottom-12 z-30 flex max-h-[calc(100%-6rem)] w-[300px] flex-col overflow-hidden rounded-2xl border shadow-xl">
      <div className="border-border-primary flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
          <Bookmark
            className="text-primary"
            fill="currentColor"
            size={16}
          />
        </span>
        <span className="text-text-primary flex-1 text-sm font-semibold">
          Bookmarks
        </span>
        {bookmarks.length > 0 && (
          <span className="badge badge-primary">{bookmarks.length}</span>
        )}
        <button
          aria-label="Close"
          className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          type="button"
          onClick={() => setOpen(false)}
        >
          <X size={15} />
        </button>
      </div>

      <div className="border-border-primary flex gap-2 border-b px-4 py-3">
        <input
          className="bg-input-bg border-input-border text-text-primary focus:border-input-focus-border min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none"
          placeholder="Name this view…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <button
          className="bg-primary hover:bg-primary-dark flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
          type="button"
          onClick={handleAdd}
        >
          <Crosshair size={14} />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
            <span className="bg-surface-hover text-text-tertiary flex h-10 w-10 items-center justify-center rounded-full">
              <Bookmark size={18} />
            </span>
            <div>
              <div className="text-text-secondary text-sm font-medium">
                No bookmarks yet
              </div>
              <div className="text-text-tertiary mt-0.5 text-xs">
                Pan to a spot and click “Add” to save the view.
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-border-primary divide-y">
            {bookmarks.map((b) => (
              <li
                key={b.id}
                className="group hover:bg-surface-hover flex items-center gap-1.5 px-3 py-2 transition-colors"
              >
                {renamingId === b.id ? (
                  <input
                    autoFocus
                    aria-label="Rename bookmark"
                    className="bg-input-bg border-input-focus-border text-text-primary min-w-0 flex-1 rounded-md border px-2 py-1 text-sm focus:outline-none"
                    value={draftName}
                    onBlur={() => commitRename(b.id)}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(b.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                ) : (
                  <button
                    className="min-w-0 flex-1 text-left"
                    title="Go to this bookmark"
                    type="button"
                    onClick={() => handleJump(b.id)}
                  >
                    <div className="text-text-primary truncate text-sm font-medium">
                      {b.name}
                    </div>
                    <div className="text-text-tertiary text-[11px] tabular-nums">
                      {b.center[0].toFixed(3)}, {b.center[1].toFixed(3)} · zoom{" "}
                      {Number(b.zoom).toFixed(1)}
                    </div>
                  </button>
                )}

                {renamingId !== b.id && (
                  <button
                    aria-label="Rename bookmark"
                    className="text-text-tertiary hover:bg-surface-hover hover:text-text-primary flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-colors group-hover:opacity-100 focus:opacity-100"
                    type="button"
                    onClick={() => startRename(b.id, b.name)}
                  >
                    <Pencil size={13} />
                  </button>
                )}

                <button
                  aria-label="Delete bookmark"
                  className="text-text-tertiary hover:text-error hover:bg-error-subtle flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  type="button"
                  onClick={() => removeBookmark(b.id)}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

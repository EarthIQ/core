import { useState } from "react";
import { useMapEditor } from "@/lib/mapEditor/store";
import { Bookmark, Crosshair, Pencil, Trash2, X } from "lucide-react";

export function BookmarkPanel({
  mapRef,
  mapReady,
}: {
  mapRef: React.RefObject<any>;
  mapReady: boolean;
}) {
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
    <div className="absolute right-3 bottom-12 z-30 w-[300px] max-h-[calc(100%-6rem)] flex flex-col bg-elevated border border-border-primary rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-primary">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <Bookmark size={16} className="text-primary" fill="currentColor" />
        </span>
        <span className="text-sm font-semibold text-text-primary flex-1">
          Bookmarks
        </span>
        {bookmarks.length > 0 && (
          <span className="badge badge-primary">{bookmarks.length}</span>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border-primary flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Name this view…"
          className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-input-bg border border-input-border text-text-primary focus:outline-none focus:border-input-focus-border"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
        >
          <Crosshair size={14} />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-4 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-hover text-text-tertiary">
              <Bookmark size={18} />
            </span>
            <div>
              <div className="text-sm font-medium text-text-secondary">
                No bookmarks yet
              </div>
              <div className="mt-0.5 text-xs text-text-tertiary">
                Pan to a spot and click “Add” to save the view.
              </div>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border-primary">
            {bookmarks.map((b) => (
              <li
                key={b.id}
                className="group flex items-center gap-1.5 px-3 py-2 hover:bg-surface-hover transition-colors"
              >
                {renamingId === b.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitRename(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(b.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-sm rounded-md bg-input-bg border border-input-focus-border text-text-primary focus:outline-none"
                    aria-label="Rename bookmark"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => handleJump(b.id)}
                    title="Go to this bookmark"
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-sm font-medium text-text-primary truncate">
                      {b.name}
                    </div>
                    <div className="text-[11px] text-text-tertiary tabular-nums">
                      {b.center[0].toFixed(3)}, {b.center[1].toFixed(3)} · zoom{" "}
                      {Number(b.zoom).toFixed(1)}
                    </div>
                  </button>
                )}

                {renamingId !== b.id && (
                  <button
                    type="button"
                    onClick={() => startRename(b.id, b.name)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover hover:text-text-primary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-colors"
                    aria-label="Rename bookmark"
                  >
                    <Pencil size={13} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => removeBookmark(b.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-error hover:bg-error-subtle transition-colors"
                  aria-label="Delete bookmark"
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
}

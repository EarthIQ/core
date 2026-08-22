import { useCallback, useRef, useState } from "react";
import {
  deleteDataset,
  downloadDataset,
  getVectorTileUrl,
  updateDataset,
} from "../../lib/datasets";
import type { DatasetItem, Toast } from "./types";

/**
 * Centralised, shared actions for the Data page.
 * Keeps the page-level state tidy while giving child components
 * stable, memoised handlers.
 */
export function useDatasetActions(opts: {
  addToast: (type: Toast["type"], message: string) => void;
  updateDatasets: (fn: (prev: DatasetItem[]) => DatasetItem[]) => void;
  refresh: () => void;
}) {
  const { addToast, updateDatasets, refresh } = opts;

  // Modal targets
  const [inspectTarget, setInspectTarget] = useState<DatasetItem | null>(null);
  const [editDataset, setEditDataset] = useState<DatasetItem | null>(null);
  const [tileUrlDataset, setTileUrlDataset] = useState<DatasetItem | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

  // Copy feedback
  const [tileCopied, setTileCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  const anyModalOpen =
    !!inspectTarget || !!tileUrlDataset || !!confirmDelete || !!editDataset;

  // ── Preview ─────────────────────────────────────────────────────────────────
  const openPreview = useCallback((ds: DatasetItem) => {
    setInspectTarget(ds);
  }, []);

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(
    async (ds: DatasetItem) => {
      try {
        const ext =
          ds.storage_key?.split(".").pop() ??
          (ds.format === "GeoJSON"
            ? "geojson"
            : ds.format === "Shapefile"
              ? "zip"
              : ds.format === "KML"
                ? "kml"
                : ds.format === "GeoParquet"
                  ? "parquet"
                  : ds.format === "CSV"
                    ? "csv"
                    : "dat");
        await downloadDataset(ds.id, `${ds.name.replace(/\s+/g, "_")}.${ext}`);
        addToast("success", "Download started.");
      } catch (err: any) {
        addToast("error", err?.message ?? "Download failed.");
      }
    },
    [addToast],
  );

  // ── Edit ────────────────────────────────────────────────────────────────────
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = useCallback((ds: DatasetItem) => {
    setEditDataset(ds);
  }, []);

  const saveEdit = useCallback(
    async (payload: {
      name?: string;
      description?: string | null;
      source?: string | null;
      crs?: string;
      tags?: string[];
    }) => {
      if (!editDataset) return;
      setEditSaving(true);
      try {
        const updated = await updateDataset(editDataset.id, {
          ...payload,
        });
        updateDatasets((prev) =>
          prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
        );
        setEditDataset(null);
        addToast("success", "Dataset updated.");
      } catch (err: any) {
        addToast("error", err?.message ?? "Update failed.");
      } finally {
        setEditSaving(false);
      }
    },
    [editDataset, updateDatasets, addToast],
  );

  // ── Delete ───────────────────────────────────────────────────────────────────
  const requestDelete = useCallback((id: string, name: string) => {
    setConfirmDelete({ ids: [id], label: name });
  }, []);

  const requestBulkDelete = useCallback((ids: string[]) => {
    setConfirmDelete({
      ids,
      label: `${ids.length} dataset${ids.length === 1 ? "" : "s"}`,
    });
  }, []);

  const performDelete = useCallback(
    async (onDone?: () => void) => {
      if (!confirmDelete) return;
      const { ids } = confirmDelete;
      updateDatasets((prev) => prev.filter((d) => !ids.includes(d.id)));
      setConfirmDelete(null);
      onDone?.();

      try {
        await Promise.all(ids.map((id) => deleteDataset(id)));
        addToast(
          "success",
          ids.length === 1
            ? "Dataset deleted."
            : `${ids.length} datasets deleted.`,
        );
      } catch {
        addToast("error", "Some deletions failed — refreshing list.");
        refresh();
      }
    },
    [confirmDelete, updateDatasets, addToast, refresh],
  );

  // ── Copy helpers ─────────────────────────────────────────────────────────────
  const handleCopyTileUrl = useCallback(
    (ds: DatasetItem) => {
      const url = getVectorTileUrl(ds.id);
      navigator.clipboard.writeText(url).then(() => {
        setTileCopied(true);
        addToast("success", "Tile URL copied to clipboard.");
        if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(
          () => setTileCopied(false),
          2000,
        );
      });
    },
    [addToast],
  );

  const handleCopyId = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(id).then(() => {
        setIdCopied(true);
        addToast("success", "Dataset ID copied.");
        if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setIdCopied(false), 2000);
      });
    },
    [addToast],
  );

  // ── Open tile URL modal ────────────────────────────────────────────────────
  const openTileUrl = useCallback((ds: DatasetItem) => {
    setTileUrlDataset(ds);
  }, []);

  // ── Close-all (Escape / backdrop) ───────────────────────────────────────────
  const closeAllModals = useCallback(() => {
    setInspectTarget(null);
    setEditDataset(null);
    setTileUrlDataset(null);
    setConfirmDelete(null);
  }, []);

  return {
    // State
    inspectTarget,
    setInspectTarget,
    editDataset,
    setEditDataset,
    editSaving,
    tileUrlDataset,
    setTileUrlDataset,
    confirmDelete,
    setConfirmDelete,
    tileCopied,
    idCopied,
    anyModalOpen,

    // Actions
    openPreview,
    handleDownload,
    openEdit,
    saveEdit,
    requestDelete,
    requestBulkDelete,
    performDelete,
    handleCopyTileUrl,
    handleCopyId,
    openTileUrl,
    closeAllModals,
  };
}

export type DatasetActionsState = ReturnType<typeof useDatasetActions>;

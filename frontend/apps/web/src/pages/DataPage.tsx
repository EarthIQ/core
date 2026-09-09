import {
  Alert,
  Button,
  Drawer,
  IconButton,
  Input,
  Select,
  ToastProvider,
  useToast,
} from "@packages/ui";
import {
  CloudUpload,
  ChevronRight,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ConfirmDeleteModal,
  DatasetGrid,
  DatasetTable,
  EditModal,
  FolderTree,
  type FolderSelection,
  MoveModal,
  Pagination,
  PreviewModal,
  ROOT_UNGROUPED,
  SummaryStats,
  TileUrlModal,
  UploadModal,
  useDatasetActions,
  FORMATS,
  type DatasetItem,
  type SortDir,
  type SortField,
  type ViewMode,
} from "@/components/data";
import {
  createFolder,
  deleteFolder,
  listDatasets,
  listFolders,
  renameFolder,
  type DataFolder,
  type GeoDatasetOut,
} from "@/lib/datasets";

const DataPageInner = () => {
  const navigate = useNavigate();
  const {
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
  } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Navigation (folder tree) + filters ─────────────────────────────────────
  const [selection, setSelection] = useState<FolderSelection>({
    folderId: null,
    type: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("all");

  // ── Sorting / view / pagination ─────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Selection / modals ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Toast adapter (keeps (type, message) signature for shared hooks) ──────
  const addToast = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      (type === "success"
        ? toastSuccess
        : type === "error"
          ? toastError
          : toastInfo)(message, { duration: 4200 });
    },
    [toastSuccess, toastError, toastInfo]
  );

  // ── Folders (catalog tree) ─────────────────────────────────────────────────
  const [folders, setFolders] = useState<DataFolder[]>([]);
  const [folderConfirm, setFolderConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      setFolders(await listFolders());
    } catch {
      /* non-fatal: the sidebar simply shows an empty folder list */
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // ── Fetch datasets ───────────────────────────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items: GeoDatasetOut[] = await listDatasets({
        type: selection.type,
        format: formatFilter,
        search: searchQuery,
        folder: selection.folderId ?? undefined,
      });
      setDatasets(items);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [selection.type, selection.folderId, formatFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchDatasets, 300);
    return () => clearTimeout(timer);
  }, [fetchDatasets]);

  // Reset page + selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, selection, formatFilter, pageSize]);

  // ── Shared dataset actions ──────────────────────────────────────────────────
  const actions = useDatasetActions({
    addToast,
    updateDatasets: (fn) => setDatasets((prev) => fn(prev)),
    refresh: fetchDatasets,
    refreshFolders: fetchFolders,
  });

  // ── Folder management handlers ─────────────────────────────────────────────
  const handleCreateFolder = useCallback(
    async (name: string, parentId: string | null) => {
      try {
        await createFolder(name, parentId);
        addToast("success", `Folder “${name}” created.`);
        await fetchFolders();
      } catch (err: any) {
        addToast("error", err?.message ?? "Could not create folder.");
      }
    },
    [addToast, fetchFolders]
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      try {
        await renameFolder(folderId, name);
        addToast("success", "Folder renamed.");
        await fetchFolders();
      } catch (err: any) {
        addToast("error", err?.message ?? "Could not rename folder.");
      }
    },
    [addToast, fetchFolders]
  );

  const requestDeleteFolder = useCallback(
    (folder: { id: string; name: string }) => {
      setFolderConfirm(folder);
    },
    []
  );

  const confirmDeleteFolder = useCallback(async () => {
    if (!folderConfirm) return;
    setFolderBusy(true);
    try {
      const res = await deleteFolder(folderConfirm.id);
      addToast(
        "success",
        res.moved_datasets > 0
          ? `Folder deleted — ${res.moved_datasets} dataset${
              res.moved_datasets === 1 ? "" : "s"
            } moved up a level.`
          : "Folder deleted."
      );
      // If we were browsing the deleted folder, step up to its parent.
      setSelection((prev) => {
        if (prev.folderId !== folderConfirm.id) return prev;
        const parent =
          folders.find((f) => f.id === folderConfirm.id)?.parent_id ?? null;
        return { folderId: parent, type: prev.type };
      });
      setFolderConfirm(null);
      await fetchFolders();
      await fetchDatasets();
    } catch (err: any) {
      addToast("error", err?.message ?? "Could not delete folder.");
    } finally {
      setFolderBusy(false);
    }
  }, [folderConfirm, folders, addToast, fetchFolders, fetchDatasets]);

  // ── Breadcrumb chain for the active folder ─────────────────────────────────
  const breadcrumb = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f] as const));
    const chain: { id: string | null; name: string }[] = [];
    let cur = selection.folderId;
    let depth = 0;
    while (cur && cur !== ROOT_UNGROUPED && byId.has(cur) && depth < 20) {
      const f = byId.get(cur);
      chain.unshift({ id: f.id, name: f.name });
      cur = f.parent_id;
      depth += 1;
    }
    if (selection.folderId === ROOT_UNGROUPED)
      chain.unshift({ id: ROOT_UNGROUPED, name: "Ungrouped" });
    if (selection.folderId === null || selection.folderId === ROOT_UNGROUPED)
      chain.unshift({ id: null, name: "All Data" });
    return chain;
  }, [selection.folderId, folders]);

  const processedDatasets = useMemo(() => {
    const sorted = [...datasets].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "format":
          cmp = a.format.localeCompare(b.format);
          break;
        case "size":
          cmp = (a.file_size_bytes ?? 0) - (b.file_size_bytes ?? 0);
          break;
        case "updated":
          cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [datasets, sortField, sortDir]);

  // Totals for the sidebar storage footer (from the current dataset list).
  const totalBytes = useMemo(
    () => datasets.reduce((s, d) => s + (d.file_size_bytes ?? 0), 0),
    [datasets]
  );
  const tiledCount = useMemo(
    () =>
      datasets.filter(
        (d) => d.meta?.ingested || d.type === "vector" || d.type === "points"
      ).length,
    [datasets]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(processedDatasets.length / pageSize)
  );
  const clampedPage = Math.min(page, totalPages);
  const pageItems = processedDatasets.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  // ── Selection handlers (table view) ─────────────────────────────────────────
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((d) => selectedIds.has(d.id));

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((d) => {
          if (checked) next.add(d.id);
          else next.delete(d.id);
        });
        return next;
      });
    },
    [pageItems]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selection.type !== "all") n += 1;
    if (selection.folderId) n += 1;
    if (formatFilter !== "all") n += 1;
    if (searchQuery.trim()) n += 1;
    return n;
  }, [selection.type, selection.folderId, formatFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setSelection({ folderId: null, type: "all" });
    setFormatFilter("all");
    setSearchQuery("");
  }, []);

  const onToggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field)
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  // ── Navigation / modal / bulk handlers ─────────────────────────────────────
  const onNavigate = useCallback((sel: FolderSelection) => {
    setSelection(sel);
    setMobileNavOpen(false);
  }, []);

  const onAddData = useCallback(() => {
    setIsAddModalOpen(true);
    setMobileNavOpen(false);
  }, []);

  const handleAddToProject = useCallback(() => {
    const n = selectedIds.size;
    addToast(
      "info",
      `Added ${n} dataset${n === 1 ? "" : "s"} - opening Projects.`
    );
    navigate("/projects");
  }, [addToast, selectedIds.size, navigate]);

  const handleBulkDelete = useCallback(() => {
    actions.requestBulkDelete(Array.from(selectedIds));
  }, [actions, selectedIds]);

  const handleBulkMove = useCallback(() => {
    const items = datasets.filter((d) => selectedIds.has(d.id));
    actions.requestMove(items);
  }, [actions, datasets, selectedIds]);

  const formatOptions = useMemo(
    () => [
      { value: "all", label: "All Formats" },
      ...FORMATS.map((f) => ({ value: f.value, label: f.label })),
    ],
    []
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="text-primary mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Spatial Catalog
          </div>
          <h1 className="text-text-primary text-2xl font-extrabold tracking-tight sm:text-3xl">
            Data Hub
          </h1>
          <p className="text-text-secondary mt-1 max-w-2xl text-sm leading-relaxed">
            Upload, inspect, and manage your vector and raster datasets -
            GeoJSON, Shapefile, COG, GeoPackage, GeoParquet, KML, and CSV.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <IconButton
            className="border-border-primary"
            label="Refresh catalog"
            size="md"
            variant="secondary"
            icon={
              <RefreshCw
                className={loading ? "animate-spin" : ""}
                size={16}
              />
            }
            onClick={fetchDatasets}
          />
          <Button
            className="font-semibold shadow-sm"
            leftIcon={<CloudUpload size={16} />}
            size="md"
            variant="primary"
            onClick={onAddData}
          >
            Add Dataset
          </Button>
        </div>
      </div>

      {/* ── Fetch error ────────────────────────────────────────────────────── */}
      {fetchError ? (
        <div>
          <Alert
            title="Couldn't load datasets"
            variant="error"
            onClose={() => setFetchError(null)}
          >
            {fetchError}
          </Alert>
        </div>
      ) : null}

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <SummaryStats
        datasets={datasets}
        loading={loading}
      />

      {/* ── Main Catalog Workspace ────────────────────────────────────────── */}
      <div className="flex items-start gap-6">
        {/* ── Folder navigation (desktop) ──────────────────────────────────── */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-4">
            <FolderTree
              folders={folders}
              loading={loading}
              selection={selection}
              tiledCount={tiledCount}
              totalBytes={totalBytes}
              totalDatasets={datasets.length}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={requestDeleteFolder}
              onNavigate={onNavigate}
              onRenameFolder={handleRenameFolder}
            />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Breadcrumb path */}
          {breadcrumb.length > 1 && (
            <nav
              aria-label="Folder path"
              className="text-text-tertiary flex flex-wrap items-center gap-1 text-xs"
            >
              {breadcrumb.map((crumb, i) => {
                const last = i === breadcrumb.length - 1;
                return (
                  <span
                    key={crumb.id ?? `root-${i}`}
                    className="flex items-center gap-1"
                  >
                    {i > 0 && (
                      <ChevronRight
                        className="shrink-0"
                        size={12}
                      />
                    )}
                    {last ? (
                      <span className="text-text-primary font-semibold">
                        {crumb.name}
                      </span>
                    ) : (
                      <button
                        className="hover:bg-surface-hover hover:text-text-primary cursor-pointer rounded px-1 py-0.5 transition-colors"
                        type="button"
                        onClick={() =>
                          onNavigate({
                            folderId: crumb.id,
                            type: "all",
                          })
                        }
                      >
                        {crumb.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}
          {/* Toolbar */}
          <div className="card bg-surface border-border-primary flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-xs">
            <div className="flex min-w-[240px] flex-1 items-center gap-2.5">
              <IconButton
                className="text-text-secondary shrink-0 lg:hidden"
                icon={<SlidersHorizontal size={18} />}
                label="Browse folders"
                size="md"
                variant="ghost"
                onClick={() => setMobileNavOpen(true)}
              />
              <div className="max-w-md flex-1">
                <Input
                  aria-label="Search datasets"
                  className="h-9 text-xs"
                  leftIcon={
                    <Search
                      className="text-text-tertiary"
                      size={16}
                    />
                  }
                  placeholder="Search by dataset name, format, or tag…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-44">
                <Select
                  options={formatOptions}
                  size="sm"
                  value={formatFilter}
                  onChange={(v) => setFormatFilter(v)}
                />
              </div>

              {/* View Switcher */}
              <div
                aria-label="View mode"
                className="border-border-primary bg-surface-hover/50 flex overflow-hidden rounded-lg border p-0.5"
                role="group"
              >
                <button
                  aria-label="Table view"
                  title="Table view"
                  type="button"
                  className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={14} />
                  <span>Table</span>
                </button>
                <button
                  aria-label="Grid view"
                  title="Grid view"
                  type="button"
                  className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={14} />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="card bg-primary/[0.08] border-primary/25 animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="bg-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white">
                  {selectedIds.size}
                </span>
                <span className="text-text-primary text-xs font-semibold">
                  dataset{selectedIds.size === 1 ? "" : "s"} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="text-xs font-semibold"
                  size="sm"
                  variant="secondary"
                  onClick={handleBulkMove}
                >
                  Move to folder…
                </Button>
                <Button
                  className="text-xs font-semibold"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddToProject}
                >
                  Add to Project
                </Button>
                <Button
                  className="text-xs font-semibold"
                  size="sm"
                  variant="error"
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </Button>
                <Button
                  className="text-xs"
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          {/* Table or Grid */}
          {viewMode === "table" ? (
            <DatasetTable
              activeFilterCount={activeFilterCount}
              allOnPageSelected={allOnPageSelected}
              items={pageItems}
              loading={loading}
              selectedIds={selectedIds}
              sortDir={sortDir}
              sortField={sortField}
              onAddData={onAddData}
              onClearFilters={clearFilters}
              onDownload={actions.handleDownload}
              onEdit={actions.openEdit}
              onInspect={actions.openPreview}
              onMove={(ds) => actions.requestMove([ds])}
              onOpenTileUrl={actions.openTileUrl}
              onRequestDelete={actions.requestDelete}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectRow={toggleSelectRow}
              onToggleSort={onToggleSort}
            />
          ) : (
            <DatasetGrid
              activeFilterCount={activeFilterCount}
              items={pageItems}
              loading={loading}
              onAddData={onAddData}
              onClearFilters={clearFilters}
              onDownload={actions.handleDownload}
              onEdit={actions.openEdit}
              onInspect={actions.openPreview}
              onMove={(ds) => actions.requestMove([ds])}
              onOpenTileUrl={actions.openTileUrl}
              onRequestDelete={actions.requestDelete}
            />
          )}

          {/* Pagination */}
          <Pagination
            loading={loading}
            page={clampedPage}
            pageSize={pageSize}
            totalItems={processedDatasets.length}
            totalPages={totalPages}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPageSizeChange={setPageSize}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
          />
        </div>
      </div>

      {/* ── Mobile folder drawer ────────────────────────────────────────────── */}
      <Drawer
        isOpen={mobileNavOpen}
        position="left"
        size="md"
        title="Browse catalog"
        onClose={() => setMobileNavOpen(false)}
      >
        <FolderTree
          folders={folders}
          loading={loading}
          selection={selection}
          tiledCount={tiledCount}
          totalBytes={totalBytes}
          totalDatasets={datasets.length}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={requestDeleteFolder}
          onNavigate={onNavigate}
          onRenameFolder={handleRenameFolder}
        />
      </Drawer>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <UploadModal
        addToast={addToast}
        folders={folders}
        open={isAddModalOpen}
        defaultFolderId={
          selection.folderId === ROOT_UNGROUPED ? null : selection.folderId
        }
        onClose={() => setIsAddModalOpen(false)}
        onUploaded={(newDs) => {
          setDatasets((prev) => [newDs, ...prev]);
          fetchFolders();
        }}
      />

      {/* ── Preview / Inspect ──────────────────────────────────────────────── */}
      {actions.inspectTarget ? (
        <PreviewModal
          addToast={addToast}
          dataset={actions.inspectTarget}
          idCopied={actions.idCopied}
          onClose={() => actions.setInspectTarget(null)}
          onCopyId={actions.handleCopyId}
          onDownload={actions.handleDownload}
          onEdit={actions.openEdit}
          onOpenTileUrl={actions.openTileUrl}
        />
      ) : null}

      {/* ── Edit metadata ──────────────────────────────────────────────────── */}
      {actions.editDataset ? (
        <EditModal
          dataset={actions.editDataset}
          saving={actions.editSaving}
          onClose={() => actions.setEditDataset(null)}
          onSave={(payload) => actions.saveEdit(payload)}
        />
      ) : null}

      {/* ── Tile URL ───────────────────────────────────────────────────────── */}
      {actions.tileUrlDataset ? (
        <TileUrlModal
          copied={actions.tileCopied}
          dataset={actions.tileUrlDataset}
          onClose={() => actions.setTileUrlDataset(null)}
          onCopy={actions.handleCopyTileUrl}
        />
      ) : null}

      {/* ── Confirm delete ─────────────────────────────────────────────────── */}
      {actions.confirmDelete ? (
        <ConfirmDeleteModal
          label={actions.confirmDelete.label}
          onCancel={() => actions.setConfirmDelete(null)}
          onConfirm={() =>
            actions.performDelete(() => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                actions.confirmDelete?.ids.forEach((id) => next.delete(id));
                return next;
              });
            })
          }
        />
      ) : null}

      {/* ── Move to folder ─────────────────────────────────────────────────── */}
      {actions.moveTargets ? (
        <MoveModal
          datasets={actions.moveTargets}
          folders={folders}
          moving={actions.moveSaving}
          onClose={() => actions.setMoveTargets(null)}
          onMove={(folderId) => {
            actions.moveDatasets(folderId);
            setSelectedIds(new Set());
          }}
        />
      ) : null}

      {/* ── Confirm delete folder ──────────────────────────────────────────── */}
      {folderConfirm ? (
        <ConfirmDeleteModal
          label={`folder “${folderConfirm.name}”`}
          onCancel={() => setFolderConfirm(null)}
          onConfirm={() => {
            if (!folderBusy) confirmDeleteFolder();
          }}
        />
      ) : null}
    </div>
  );
};

export default function DataPage() {
  return (
    <ToastProvider
      defaultDuration={4200}
      maxToasts={5}
      position="bottom-right"
    >
      <DataPageInner />
    </ToastProvider>
  );
}

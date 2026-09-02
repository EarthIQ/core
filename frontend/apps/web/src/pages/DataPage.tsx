import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { listDatasets, type GeoDatasetOut } from "../lib/datasets";
import {
  ConfirmDeleteModal,
  DatasetGrid,
  DatasetTable,
  EditModal,
  FolderTree,
  type FolderSelection,
  Pagination,
  PreviewModal,
  SummaryStats,
  TileUrlModal,
  UploadModal,
  useDatasetActions,
} from "../components/data";
import {
  FORMATS,
  type DatasetItem,
  type SortDir,
  type SortField,
  type ViewMode,
} from "../components/data";

function DataPageInner() {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, info: toastInfo } =
    useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Navigation (folder tree) + filters ─────────────────────────────────────
  const [selection, setSelection] = useState<FolderSelection>({
    type: "all",
    tag: null,
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
          : toastInfo
      )(message, { duration: 4200 });
    },
    [toastSuccess, toastError, toastInfo],
  );

  // ── Fetch datasets ───────────────────────────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items: GeoDatasetOut[] = await listDatasets({
        type: selection.type,
        format: formatFilter,
        search: searchQuery,
      });
      setDatasets(items as DatasetItem[]);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [selection.type, formatFilter, searchQuery]);

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
  });

  // ── Derived: tag filter is applied client-side ──────────────────────────────
  const tagFiltered = useMemo(() => {
    if (!selection.tag) return datasets;
    if (selection.tag === "__untagged__")
      return datasets.filter((d) => !d.tags || d.tags.length === 0);
    return datasets.filter((d) => d.tags?.includes(selection.tag!));
  }, [datasets, selection.tag]);

  const processedDatasets = useMemo(() => {
    const sorted = [...tagFiltered].sort((a, b) => {
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
  }, [tagFiltered, sortField, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedDatasets.length / pageSize),
  );
  const clampedPage = Math.min(page, totalPages);
  const pageItems = processedDatasets.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
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
    [pageItems],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selection.type !== "all") n += 1;
    if (selection.tag) n += 1;
    if (formatFilter !== "all") n += 1;
    if (searchQuery.trim()) n += 1;
    return n;
  }, [selection.type, selection.tag, formatFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setSelection({ type: "all", tag: null });
    setFormatFilter("all");
    setSearchQuery("");
  }, []);

  const onToggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
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
    addToast("info", `Added ${n} dataset${n === 1 ? "" : "s"} — opening Projects.`);
    navigate("/projects");
  }, [addToast, selectedIds.size, navigate]);

  const handleBulkDelete = useCallback(() => {
    actions.requestBulkDelete(Array.from(selectedIds));
  }, [actions, selectedIds]);

  const formatOptions = useMemo(
    () => [
      { value: "all", label: "All Formats" },
      ...FORMATS.map((f) => ({ value: f.value, label: f.label })),
    ],
    [],
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Spatial Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Data Hub
          </h1>
          <p className="mt-1 text-sm text-text-secondary max-w-2xl leading-relaxed">
            Upload, inspect, and manage your vector and raster datasets — GeoJSON,
            Shapefile, COG, GeoPackage, GeoParquet, KML, and CSV.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <IconButton
            icon={
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            }
            label="Refresh catalog"
            variant="secondary"
            size="md"
            onClick={fetchDatasets}
            className="border-border-primary"
          />
          <Button
            variant="primary"
            size="md"
            leftIcon={<CloudUpload size={16} />}
            onClick={onAddData}
            className="shadow-sm font-semibold"
          >
            Add Dataset
          </Button>
        </div>
      </div>

      {/* ── Fetch error ────────────────────────────────────────────────────── */}
      {fetchError && (
        <div>
          <Alert
            variant="error"
            title="Couldn't load datasets"
            onClose={() => setFetchError(null)}
          >
            {fetchError}
          </Alert>
        </div>
      )}

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <SummaryStats datasets={datasets} loading={loading} />

      {/* ── Main Catalog Workspace ────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        {/* ── Folder navigation (desktop) ──────────────────────────────────── */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-4">
            <FolderTree
              datasets={datasets}
              loading={loading}
              selection={selection}
              onNavigate={onNavigate}
              onOpenDataset={actions.openPreview}
            />
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="card p-3 bg-surface border border-border-primary rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
              <IconButton
                icon={<SlidersHorizontal size={18} />}
                label="Browse folders"
                variant="ghost"
                size="md"
                className="lg:hidden shrink-0 text-text-secondary"
                onClick={() => setMobileNavOpen(true)}
              />
              <div className="flex-1 max-w-md">
                <Input
                  leftIcon={<Search size={16} className="text-text-tertiary" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by dataset name, format, or tag…"
                  aria-label="Search datasets"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-44">
                <Select
                  options={formatOptions}
                  value={formatFilter}
                  onChange={(v) => setFormatFilter(v)}
                  size="sm"
                />
              </div>

              {/* View Switcher */}
              <div
                className="flex rounded-lg overflow-hidden border border-border-primary bg-surface-hover/50 p-0.5"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  title="Table view"
                  className={`px-2.5 h-7 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                >
                  <List size={14} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  title="Grid view"
                  className={`px-2.5 h-7 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="card px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-primary/[0.08] border border-primary/25 rounded-xl animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 rounded-full bg-primary text-white text-xs font-bold items-center justify-center">
                  {selectedIds.size}
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  dataset{selectedIds.size === 1 ? "" : "s"} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddToProject}
                  className="text-xs font-semibold"
                >
                  Add to Project
                </Button>
                <Button
                  variant="error"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-xs font-semibold"
                >
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          {/* Table or Grid */}
          {viewMode === "table" ? (
            <DatasetTable
              items={pageItems}
              loading={loading}
              selectedIds={selectedIds}
              allOnPageSelected={allOnPageSelected}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectRow={toggleSelectRow}
              sortField={sortField}
              sortDir={sortDir}
              onToggleSort={onToggleSort}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
              onAddData={onAddData}
              onInspect={actions.openPreview}
              onEdit={actions.openEdit}
              onDownload={actions.handleDownload}
              onOpenTileUrl={actions.openTileUrl}
              onRequestDelete={actions.requestDelete}
            />
          ) : (
            <DatasetGrid
              items={pageItems}
              loading={loading}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
              onAddData={onAddData}
              onInspect={actions.openPreview}
              onEdit={actions.openEdit}
              onDownload={actions.handleDownload}
              onOpenTileUrl={actions.openTileUrl}
              onRequestDelete={actions.requestDelete}
            />
          )}

          {/* Pagination */}
          <Pagination
            loading={loading}
            totalItems={processedDatasets.length}
            page={clampedPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* ── Mobile folder drawer ────────────────────────────────────────────── */}
      <Drawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        position="left"
        size="md"
        title="Browse catalog"
      >
        <FolderTree
          datasets={datasets}
          loading={loading}
          selection={selection}
          onNavigate={onNavigate}
          onOpenDataset={actions.openPreview}
        />
      </Drawer>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <UploadModal
        open={isAddModalOpen}
        addToast={addToast}
        onClose={() => setIsAddModalOpen(false)}
        onUploaded={(newDs) =>
          setDatasets((prev) => [newDs as DatasetItem, ...prev])
        }
      />

      {/* ── Preview / Inspect ──────────────────────────────────────────────── */}
      {actions.inspectTarget && (
        <PreviewModal
          dataset={actions.inspectTarget}
          idCopied={actions.idCopied}
          onClose={() => actions.setInspectTarget(null)}
          onDownload={actions.handleDownload}
          onEdit={actions.openEdit}
          onOpenTileUrl={actions.openTileUrl}
          onCopyId={actions.handleCopyId}
          addToast={addToast}
        />
      )}

      {/* ── Edit metadata ──────────────────────────────────────────────────── */}
      {actions.editDataset && (
        <EditModal
          dataset={actions.editDataset}
          saving={actions.editSaving}
          onClose={() => actions.setEditDataset(null)}
          onSave={(payload) => actions.saveEdit(payload)}
        />
      )}

      {/* ── Tile URL ───────────────────────────────────────────────────────── */}
      {actions.tileUrlDataset && (
        <TileUrlModal
          dataset={actions.tileUrlDataset}
          copied={actions.tileCopied}
          onClose={() => actions.setTileUrlDataset(null)}
          onCopy={actions.handleCopyTileUrl}
        />
      )}

      {/* ── Confirm delete ─────────────────────────────────────────────────── */}
      {actions.confirmDelete && (
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
      )}
    </div>
  );
}

export default function DataPage() {
  return (
    <ToastProvider position="bottom-right" maxToasts={5} defaultDuration={4200}>
      <DataPageInner />
    </ToastProvider>
  );
}

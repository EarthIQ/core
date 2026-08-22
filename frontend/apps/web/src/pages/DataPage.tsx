import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDatasets, type GeoDatasetOut } from "../lib/datasets";
import {
  BulkActionBar,
  ConfirmDeleteModal,
  DataPageHeader,
  DatasetGrid,
  DatasetTable,
  EditModal,
  FilterSidebar,
  Pagination,
  PreviewModal,
  SummaryStats,
  SupportedFormats,
  TileUrlModal,
  Toasts,
  UploadModal,
  useDatasetActions,
} from "../components/data";
import type {
  DatasetItem,
  SortDir,
  SortField,
  Toast,
  ViewMode,
} from "../components/data";

let toastSeq = 0;

export default function DataPage() {
  const navigate = useNavigate();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // ── Sorting / view / pagination ─────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Upload modal ────────────────────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ── Toasts ───────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch datasets ───────────────────────────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items: GeoDatasetOut[] = await listDatasets({
        type: typeFilter,
        format: formatFilter,
        search: searchQuery,
      });
      setDatasets(items as DatasetItem[]);
    } catch (err: any) {
      setFetchError(err?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, formatFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchDatasets, 300);
    return () => clearTimeout(timer);
  }, [fetchDatasets]);

  // Reset page + selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, typeFilter, formatFilter, selectedTags, pageSize]);

  // ── Shared dataset actions ───────────────────────────────────────────────────
  const actions = useDatasetActions({
    addToast,
    updateDatasets: (fn) => setDatasets((prev) => fn(prev)),
    refresh: fetchDatasets,
  });

  // ── Escape key closes modals; lock scroll while any modal open ──────────────
  const anyModalOpen = isAddModalOpen || actions.anyModalOpen;

  useEffect(() => {
    if (!anyModalOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        actions.closeAllModals();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [anyModalOpen, actions.closeAllModals]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const s = new Set<string>();
    datasets.forEach((d) => d.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [datasets]);

  const processedDatasets = useMemo(() => {
    let list = datasets;
    if (selectedTags.size > 0) {
      list = list.filter((d) => d.tags?.some((t) => selectedTags.has(t)));
    }
    const sorted = [...list].sort((a, b) => {
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
  }, [datasets, selectedTags, sortField, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedDatasets.length / pageSize),
  );
  const clampedPage = Math.min(page, totalPages);
  const pageItems = processedDatasets.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (formatFilter !== "all" ? 1 : 0) +
    selectedTags.size;

  // ── Filter / sort handlers ─────────────────────────────────────────────────
  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("all");
    setFormatFilter("all");
    setSelectedTags(new Set());
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // ── Selection helpers ───────────────────────────────────────────────────────
  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageItems.forEach((d) => {
        if (checked) next.add(d.id);
        else next.delete(d.id);
      });
      return next;
    });
  }

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((d) => selectedIds.has(d.id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[100rem] mx-auto flex flex-col gap-5">
      <DataPageHeader onAddData={() => setIsAddModalOpen(true)} />

      <SummaryStats datasets={datasets} loading={loading} />

      {/* ── Supported formats reference ─────────────────────────────────────── */}
      <SupportedFormats onAddData={() => setIsAddModalOpen(true)} />

      {/* ── Workspace: sidebar filters + content ───────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <FilterSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          formatFilter={formatFilter}
          onFormatFilterChange={setFormatFilter}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearFilters}
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          sortField={sortField}
          onSortFieldChange={setSortField}
          sortDir={sortDir}
          onToggleSortDir={() =>
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
          }
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={fetchDatasets}
        />

        {/* ── Content column ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
          {/* Error Banner */}
          {fetchError && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              <span className="alert-content text-sm">{fetchError}</span>
              <button
                onClick={fetchDatasets}
                className="ml-auto text-error underline text-sm bg-transparent border-none cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <BulkActionBar
            count={selectedIds.size}
            onAddToProject={() => navigate("/projects")}
            onDelete={() => actions.requestBulkDelete(Array.from(selectedIds))}
            onClear={() => setSelectedIds(new Set())}
          />

          {viewMode === "table" ? (
            <DatasetTable
              items={pageItems}
              loading={loading}
              selectedIds={selectedIds}
              allOnPageSelected={allOnPageSelected}
              onToggleSelectAll={toggleSelectAllOnPage}
              onToggleSelectRow={toggleSelectRow}
              sortField={sortField}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              activeFilterCount={activeFilterCount}
              fetchError={fetchError}
              onClearFilters={clearFilters}
              onAddData={() => setIsAddModalOpen(true)}
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
              selectedIds={selectedIds}
              onToggleSelectRow={toggleSelectRow}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
              onAddData={() => setIsAddModalOpen(true)}
              onInspect={actions.openPreview}
              onEdit={actions.openEdit}
              onDownload={actions.handleDownload}
              onOpenTileUrl={actions.openTileUrl}
              onRequestDelete={actions.requestDelete}
            />
          )}

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

      {/* ── Upload Modal ───────────────────────────────────────────────────── */}
      <UploadModal
        open={isAddModalOpen}
        addToast={addToast}
        onClose={() => setIsAddModalOpen(false)}
        onUploaded={(newDs) =>
          setDatasets((prev) => [newDs as DatasetItem, ...prev])
        }
      />

      {/* ── Preview Modal (with attribute view) ────────────────────────────── */}
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

      {/* ── Edit Metadata Modal ─────────────────────────────────────────────── */}
      {actions.editDataset && (
        <EditModal
          dataset={actions.editDataset}
          saving={actions.editSaving}
          onClose={() => actions.setEditDataset(null)}
          onSave={(payload) => actions.saveEdit(payload)}
        />
      )}

      {/* ── Tile URL Modal ─────────────────────────────────────────────────── */}
      {actions.tileUrlDataset && (
        <TileUrlModal
          dataset={actions.tileUrlDataset}
          copied={actions.tileCopied}
          onClose={() => actions.setTileUrlDataset(null)}
          onCopy={actions.handleCopyTileUrl}
        />
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {actions.confirmDelete && (
        <ConfirmDeleteModal
          label={actions.confirmDelete.label}
          onCancel={() => actions.setConfirmDelete(null)}
          onConfirm={() =>
            actions.performDelete(() => {
              // Clear deleted ids from selection
              setSelectedIds((prev) => {
                const next = new Set(prev);
                actions.confirmDelete?.ids.forEach((id) => next.delete(id));
                return next;
              });
            })
          }
        />
      )}

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

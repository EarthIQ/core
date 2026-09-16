import { Alert, Drawer, useToast } from "@packages/ui";
import {
  Download,
  Eye,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Map as MapIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BulkActionBar,
  ConfirmDeleteModal,
  ContextMenu,
  type ContextMenuItem,
  DetailsPane,
  EditModal,
  type FolderSelection,
  FileList,
  FolderTree,
  MoveModal,
  NewFolderModal,
  Pagination,
  PreviewModal,
  ROOT_UNGROUPED,
  StatusBar,
  TileUrlModal,
  UploadModal,
  useDatasetActions,
  ExplorerToolbar,
  FORMATS,
  isVectorized,
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
  moveDataset,
  renameFolder,
  type DataFolder,
  type GeoDatasetOut,
} from "@/lib/datasets";

type FolderModal =
  | { mode: "create"; parentId: string | null; parentLabel: string }
  | { mode: "rename"; folderId: string; folderName: string };

type Ctx = { x: number; y: number; kind: "dataset" | "folder"; id: string };

const DataPageInner = () => {
  const navigate = useNavigate();
  const {
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
  } = useToast();

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

  // ── Core data ───────────────────────────────────────────────────────────────
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [folders, setFolders] = useState<DataFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Location (folder) + persistent filters ─────────────────────────────────
  const [nav, setNav] = useState<{ stack: (string | null)[]; idx: number }>({
    stack: [null],
    idx: 0,
  });
  const locFolder = nav.stack[nav.idx];
  const [typeFilter, setTypeFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Sort / view / pagination ────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("details");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // ── Selection (single → preview pane; multi → bulk) ────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Modals / menus ──────────────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [folderModal, setFolderModal] = useState<FolderModal | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderConfirm, setFolderConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // ── Fetch folders ───────────────────────────────────────────────────────────
  const fetchFolders = useCallback(async () => {
    try {
      setFolders(await listFolders());
    } catch {
      /* non-fatal: sidebar simply shows an empty folder list */
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // ── Fetch datasets (debounced) ──────────────────────────────────────────────
  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const items: GeoDatasetOut[] = await listDatasets({
        type: typeFilter,
        format: formatFilter,
        search: searchQuery,
        folder: locFolder ?? undefined,
      });
      setDatasets(items);
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load datasets"
      );
    } finally {
      setLoading(false);
    }
  }, [typeFilter, formatFilter, searchQuery, locFolder]);

  useEffect(() => {
    const t = setTimeout(fetchDatasets, 250);
    return () => clearTimeout(t);
  }, [fetchDatasets]);

  // ── Shared dataset actions (preview / edit / move / delete / download…) ────
  const actions = useDatasetActions({
    addToast,
    updateDatasets: (fn) => setDatasets((prev) => fn(prev)),
    refresh: fetchDatasets,
    refreshFolders: fetchFolders,
  });

  // ── Folder navigation history (back / forward / up) ─────────────────────────
  const canBack = nav.idx > 0;
  const canForward = nav.idx < nav.stack.length - 1;
  const canUp = locFolder !== null;

  const pushNav = useCallback((folderId: string | null) => {
    setNav((prev) => {
      const stack = prev.stack.slice(0, prev.idx + 1);
      if (stack[stack.length - 1] === folderId) return prev;
      stack.push(folderId);
      return { stack, idx: stack.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setNav((p) => (p.idx > 0 ? { ...p, idx: p.idx - 1 } : p));
  }, []);

  const goForward = useCallback(() => {
    setNav((p) => (p.idx < p.stack.length - 1 ? { ...p, idx: p.idx + 1 } : p));
  }, []);

  const goUp = useCallback(() => {
    let target: string | null;
    if (locFolder === ROOT_UNGROUPED) target = null;
    else target = folders.find((f) => f.id === locFolder)?.parent_id ?? null;
    if (target !== locFolder) pushNav(target);
  }, [locFolder, folders, pushNav]);

  const handleSidebarNavigate = useCallback(
    (sel: FolderSelection) => {
      setTypeFilter(sel.type);
      if (sel.folderId !== locFolder) pushNav(sel.folderId);
    },
    [locFolder, pushNav]
  );

  // Reset paging + selection whenever location or a filter changes.
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    setActiveId(null);
  }, [locFolder, typeFilter, searchQuery, formatFilter]);

  // ── Selection handlers ──────────────────────────────────────────────────────
  const handleSingleSelect = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
    setActiveId(id);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setActiveId(null);
  }, []);

  // ── Add to project (navigates to the Projects workspace) ───────────────────
  const handleAddToProject = useCallback(
    (ids: string[]) => {
      addToast(
        "info",
        `Added ${ids.length} dataset${ids.length === 1 ? "" : "s"} — opening Projects.`
      );
      navigate("/projects");
    },
    [addToast, navigate]
  );
  // ── Folder create / rename / delete ─────────────────────────────────────────
  const requestDeleteFolder = useCallback(
    (folder: { id: string; name: string }) => setFolderConfirm(folder),
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
      if (locFolder === folderConfirm.id) {
        const parent =
          folders.find((f) => f.id === folderConfirm.id)?.parent_id ?? null;
        pushNav(parent);
      }
      setFolderConfirm(null);
      await fetchFolders();
      await fetchDatasets();
    } catch (err: unknown) {
      addToast(
        "error",
        err instanceof Error ? err.message : "Could not delete folder."
      );
    } finally {
      setFolderBusy(false);
    }
  }, [
    folderConfirm,
    folders,
    locFolder,
    pushNav,
    fetchFolders,
    fetchDatasets,
    addToast,
  ]);

  const confirmFolderModal = useCallback(
    async (name: string) => {
      if (!folderModal) return;
      setFolderBusy(true);
      try {
        if (folderModal.mode === "create") {
          await createFolder(name, folderModal.parentId);
          addToast("success", `Folder “${name}” created.`);
        } else {
          await renameFolder(folderModal.folderId, name);
          addToast("success", "Folder renamed.");
        }
        setFolderModal(null);
        await fetchFolders();
        await fetchDatasets();
      } catch (err: unknown) {
        addToast(
          "error",
          err instanceof Error ? err.message : "Could not save folder."
        );
      } finally {
        setFolderBusy(false);
      }
    },
    [folderModal, addToast, fetchFolders, fetchDatasets]
  );

  // ── Direct folder create / rename (used by the FolderTree inline inputs) ──
  const createFolderDirect = useCallback(
    async (name: string, parentId: string | null) => {
      try {
        await createFolder(name, parentId);
        addToast("success", `Folder “${name}” created.`);
        await fetchFolders();
        await fetchDatasets();
      } catch (err: unknown) {
        addToast(
          "error",
          err instanceof Error ? err.message : "Could not create folder."
        );
      }
    },
    [addToast, fetchFolders, fetchDatasets]
  );

  const renameFolderDirect = useCallback(
    async (folderId: string, name: string) => {
      try {
        await renameFolder(folderId, name);
        addToast("success", "Folder renamed.");
        await fetchFolders();
        await fetchDatasets();
      } catch (err: unknown) {
        addToast(
          "error",
          err instanceof Error ? err.message : "Could not rename folder."
        );
      }
    },
    [addToast, fetchFolders, fetchDatasets]
  );

  // ── Drag-and-drop: move dataset(s) into a folder ────────────────────────────
  const moveDatasetsByIds = useCallback(
    async (folderId: string, ids: string[]) => {
      try {
        await Promise.all(ids.map((id) => moveDataset(id, folderId)));
        addToast(
          "success",
          ids.length === 1 ? "Dataset moved." : `${ids.length} datasets moved.`
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        setActiveId((cur) => (cur && ids.includes(cur) ? null : cur));
        await fetchFolders();
        await fetchDatasets();
      } catch (err: unknown) {
        addToast("error", err instanceof Error ? err.message : "Move failed.");
      }
    },
    [addToast, fetchFolders, fetchDatasets]
  );
  // ── Derived: breadcrumb, subfolders, sorting, paging ───────────────────────
  const breadcrumb = useMemo(() => {
    const byId = new Map(folders.map((f) => [f.id, f] as [string, DataFolder]));
    const chain: { id: string | null; name: string }[] = [];
    let cur = locFolder;
    let depth = 0;
    while (cur && cur !== ROOT_UNGROUPED && byId.has(cur) && depth < 20) {
      const f = byId.get(cur);
      chain.unshift({ id: f.id, name: f.name });
      cur = f.parent_id;
      depth += 1;
    }
    if (locFolder === ROOT_UNGROUPED)
      chain.unshift({ id: ROOT_UNGROUPED, name: "Ungrouped" });
    chain.unshift({ id: null, name: "All Data" });
    return chain;
  }, [locFolder, folders]);

  const subfolders = useMemo(() => {
    const byName = (a: DataFolder, b: DataFolder) =>
      a.name.localeCompare(b.name);
    if (locFolder === null)
      return folders.filter((f) => f.parent_id === null).sort(byName);
    if (locFolder === ROOT_UNGROUPED) return [];
    return folders.filter((f) => f.parent_id === locFolder).sort(byName);
  }, [folders, locFolder]);

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

  const totalPages = Math.max(
    1,
    Math.ceil(processedDatasets.length / pageSize)
  );
  const clampedPage = Math.min(page, totalPages);
  const pageItems = processedDatasets.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((d) => selectedIds.has(d.id));

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((d) =>
          checked ? next.add(d.id) : next.delete(d.id)
        );
        return next;
      });
    },
    [pageItems]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (typeFilter !== "all") n += 1;
    if (locFolder) n += 1;
    if (formatFilter !== "all") n += 1;
    if (searchQuery.trim()) n += 1;
    return n;
  }, [typeFilter, locFolder, formatFilter, searchQuery]);

  const clearFilters = useCallback(() => {
    setTypeFilter("all");
    setFormatFilter("all");
    setSearchQuery("");
    pushNav(null);
  }, [pushNav]);

  const formatOptions = useMemo(
    () => [
      { value: "all", label: "All Formats" },
      ...FORMATS.map((f) => ({ value: f.value, label: f.label })),
    ],
    []
  );

  const totalBytes = useMemo(
    () => datasets.reduce((s, d) => s + (d.file_size_bytes ?? 0), 0),
    [datasets]
  );

  const tiledCount = useMemo(
    () => datasets.filter((d) => isVectorized(d)).length,
    [datasets]
  );

  const activeDataset = activeId
    ? (datasets.find((d) => d.id === activeId) ?? null)
    : null;
  // ── Context menu builders ───────────────────────────────────────────────────
  const datasetMenu = useCallback(
    (d: DatasetItem): ContextMenuItem[] => [
      {
        key: "inspect",
        label: "Inspect & preview",
        icon: <Eye size={15} />,
        onClick: () => actions.openPreview(d),
      },
      {
        key: "edit",
        label: "Edit metadata",
        icon: <Pencil size={15} />,
        onClick: () => actions.openEdit(d),
      },
      {
        key: "move",
        label: "Move to folder…",
        icon: <FolderInput size={15} />,
        onClick: () => actions.requestMove([d]),
      },
      {
        key: "download",
        label: "Download",
        icon: <Download size={15} />,
        onClick: () => actions.handleDownload(d),
      },
      ...(isVectorized(d)
        ? [
            {
              key: "tiles",
              label: "MVT tile URL",
              icon: <MapIcon size={15} />,
              onClick: () => actions.openTileUrl(d),
            },
          ]
        : []),
      {
        key: "project",
        label: "Add to project",
        icon: <FolderPlus size={15} />,
        onClick: () => handleAddToProject([d.id]),
      },
      { key: "sep", label: "", divider: true, onClick: () => {} },
      {
        key: "delete",
        label: "Delete",
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => actions.requestDelete(d.id, d.name),
      },
    ],
    [actions, handleAddToProject]
  );

  const folderMenu = useCallback(
    (f: { id: string; name: string }): ContextMenuItem[] => [
      {
        key: "open",
        label: "Open",
        icon: <FolderOpen size={15} />,
        onClick: () => pushNav(f.id),
      },
      {
        key: "new",
        label: "New subfolder",
        icon: <FolderPlus size={15} />,
        onClick: () =>
          setFolderModal({
            mode: "create",
            parentId: f.id,
            parentLabel: f.name,
          }),
      },
      {
        key: "rename",
        label: "Rename…",
        icon: <Pencil size={15} />,
        onClick: () =>
          setFolderModal({
            mode: "rename",
            folderId: f.id,
            folderName: f.name,
          }),
      },
      { key: "sep", label: "", divider: true, onClick: () => {} },
      {
        key: "delete",
        label: "Delete folder",
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => requestDeleteFolder(f),
      },
    ],
    [pushNav, requestDeleteFolder]
  );

  const ctxDataset =
    ctx?.kind === "dataset"
      ? (datasets.find((d) => d.id === ctx.id) ?? null)
      : null;
  const ctxFolder =
    ctx?.kind === "folder"
      ? (folders.find((f) => f.id === ctx.id) ?? null)
      : null;

  // ── Global keyboard shortcuts (/, Backspace, Esc) ──────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable;
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Backspace" && locFolder !== null) {
        e.preventDefault();
        goUp();
      } else if (e.key === "Escape" && selectedIds.size > 0) {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goUp, clearSelection, locFolder, selectedIds.size]);

  return (
    <div className="bg-base flex h-full min-h-0 flex-col overflow-hidden">
      {/* ── Command bar ─────────────────────────────────────────────────────── */}
      <ExplorerToolbar
        activeFilterCount={activeFilterCount}
        breadcrumb={breadcrumb}
        canBack={canBack}
        canForward={canForward}
        canUp={canUp}
        formatFilter={formatFilter}
        formatOptions={formatOptions}
        loading={loading}
        searchInputRef={searchRef}
        searchQuery={searchQuery}
        sortDir={sortDir}
        sortField={sortField}
        viewMode={viewMode}
        onBack={goBack}
        onClearFilters={clearFilters}
        onFormatFilterChange={setFormatFilter}
        onForward={goForward}
        onNavigateCrumb={(id) => pushNav(id)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onRefresh={fetchDatasets}
        onSearchChange={setSearchQuery}
        onSortFieldChange={setSortField}
        onUp={goUp}
        onUpload={() => setIsAddOpen(true)}
        onViewModeChange={setViewMode}
        onNewFolder={() =>
          setFolderModal(
            locFolder === ROOT_UNGROUPED
              ? { mode: "create", parentId: null, parentLabel: "Ungrouped" }
              : {
                  mode: "create",
                  parentId: locFolder,
                  parentLabel:
                    locFolder === null
                      ? "All Data"
                      : (folders.find((f) => f.id === locFolder)?.name ??
                        "This folder"),
                }
          )
        }
        onToggleSortDir={() =>
          setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        }
      />

      {fetchError ? (
        <div className="px-4 pt-4 lg:px-6">
          <Alert
            title="Could not load datasets"
            variant="error"
          >
            {fetchError}
          </Alert>
        </div>
      ) : null}
      {/* ── Body: left nav · main list · right details ──────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left navigation (desktop) */}
        <aside className="border-border-primary hidden w-64 shrink-0 overflow-y-auto border-r lg:block">
          <FolderTree
            folders={folders}
            loading={loading}
            selection={{ folderId: locFolder, type: typeFilter }}
            tiledCount={tiledCount}
            totalBytes={totalBytes}
            totalDatasets={datasets.length}
            onCreateFolder={createFolderDirect}
            onDeleteFolder={requestDeleteFolder}
            onNavigate={handleSidebarNavigate}
            onRenameFolder={renameFolderDirect}
          />
        </aside>
        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex-1 p-4 lg:p-6">
            {/* Bulk action bar (multi-select) */}
            {selectedIds.size > 1 ? (
              <div className="mb-4">
                <BulkActionBar
                  count={selectedIds.size}
                  onClear={clearSelection}
                  onAddToProject={() =>
                    handleAddToProject(Array.from(selectedIds))
                  }
                  onDelete={() => {
                    actions.requestBulkDelete(Array.from(selectedIds));
                    clearSelection();
                  }}
                />
              </div>
            ) : null}

            <FileList
              activeDatasetId={activeId}
              activeFilterCount={activeFilterCount}
              allOnPageSelected={allOnPageSelected}
              folders={subfolders}
              items={pageItems}
              loading={loading}
              selectedIds={selectedIds}
              viewMode={viewMode}
              onActivate={(ds) => actions.openPreview(ds)}
              onAddData={() => setIsAddOpen(true)}
              onClearFilters={clearFilters}
              onDropDatasetsOnFolder={moveDatasetsByIds}
              onOpenFolder={(id) => pushNav(id)}
              onSingleSelect={handleSingleSelect}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              onDatasetContextMenu={(ds, pos) =>
                setCtx({
                  x: pos.clientX,
                  y: pos.clientY,
                  kind: "dataset",
                  id: ds.id,
                })
              }
              onFolderContextMenu={(folder, pos) =>
                setCtx({
                  x: pos.clientX,
                  y: pos.clientY,
                  kind: "folder",
                  id: folder.id,
                })
              }
            />
          </div>

          {/* Pagination */}
          <div className="px-4 pb-4 lg:px-6">
            <Pagination
              loading={loading}
              page={clampedPage}
              pageSize={pageSize}
              totalItems={processedDatasets.length}
              totalPages={totalPages}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </main>
        {/* Right details / preview pane (wide screens) */}
        <aside className="border-border-primary hidden w-[340px] shrink-0 overflow-y-auto border-l xl:block">
          <DetailsPane
            allDatasets={datasets}
            dataset={activeDataset}
            folders={folders}
            idCopied={actions.idCopied}
            loading={loading}
            onAddToProject={handleAddToProject}
            onClose={clearSelection}
            onCopyId={actions.handleCopyId}
            onDownload={actions.handleDownload}
            onEdit={actions.openEdit}
            onInspect={actions.openPreview}
            onOpenTileUrl={actions.openTileUrl}
            onRequestDelete={(id, name) => {
              actions.requestDelete(id, name);
              clearSelection();
            }}
          />
        </aside>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <StatusBar
        activeFilterCount={activeFilterCount}
        folderCount={subfolders.length}
        itemCount={processedDatasets.length}
        loading={loading}
        selectedCount={selectedIds.size}
        totalBytes={totalBytes}
        onClearFilters={clearFilters}
      />
      {/* ── Mobile navigation drawer ────────────────────────────────────────── */}
      <Drawer
        isOpen={mobileNavOpen}
        position="left"
        size="sm"
        title="Browse"
        onClose={() => setMobileNavOpen(false)}
      >
        <div className="h-full overflow-y-auto">
          <FolderTree
            folders={folders}
            loading={loading}
            selection={{ folderId: locFolder, type: typeFilter }}
            tiledCount={tiledCount}
            totalBytes={totalBytes}
            totalDatasets={datasets.length}
            onCreateFolder={createFolderDirect}
            onDeleteFolder={requestDeleteFolder}
            onRenameFolder={renameFolderDirect}
            onNavigate={(sel) => {
              handleSidebarNavigate(sel);
              setMobileNavOpen(false);
            }}
          />
        </div>
      </Drawer>

      {/* ── Context menus ───────────────────────────────────────────────────── */}
      {ctx && ctxDataset ? (
        <ContextMenu
          items={datasetMenu(ctxDataset)}
          title={ctxDataset.name}
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
        />
      ) : ctx && ctxFolder ? (
        <ContextMenu
          items={folderMenu(ctxFolder)}
          title={ctxFolder.name}
          x={ctx.x}
          y={ctx.y}
          onClose={() => setCtx(null)}
        />
      ) : null}
      {/* ── Upload ──────────────────────────────────────────────────────────── */}
      <UploadModal
        addToast={addToast}
        defaultFolderId={locFolder === ROOT_UNGROUPED ? null : locFolder}
        folders={folders}
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onUploaded={() => {
          fetchDatasets();
          fetchFolders();
        }}
      />

      {/* ── New folder / rename folder ──────────────────────────────────────── */}
      {folderModal ? (
        <NewFolderModal
          creating={folderBusy}
          title={folderModal.mode === "rename" ? "Rename folder" : "New folder"}
          confirmLabel={
            folderModal.mode === "rename" ? "Rename" : "Create folder"
          }
          description={
            folderModal.mode === "rename"
              ? `Rename “${folderModal.folderName}”`
              : `Create a folder inside “${folderModal.parentLabel}”`
          }
          initialValue={
            folderModal.mode === "rename" ? folderModal.folderName : ""
          }
          onClose={() => !folderBusy && setFolderModal(null)}
          onConfirm={confirmFolderModal}
        />
      ) : null}

      {/* ── Dataset modals (preview / edit / tile / move / delete) ─────────── */}
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

      {actions.editDataset ? (
        <EditModal
          dataset={actions.editDataset}
          saving={actions.editSaving}
          onClose={() => actions.setEditDataset(null)}
          onSave={actions.saveEdit}
        />
      ) : null}

      {actions.tileUrlDataset ? (
        <TileUrlModal
          copied={actions.tileCopied}
          dataset={actions.tileUrlDataset}
          onClose={() => actions.setTileUrlDataset(null)}
          onCopy={actions.handleCopyTileUrl}
        />
      ) : null}

      {actions.moveTargets ? (
        <MoveModal
          datasets={actions.moveTargets}
          folders={folders}
          moving={actions.moveSaving}
          onClose={() => actions.setMoveTargets(null)}
          onMove={(folderId) => actions.moveDatasets(folderId)}
        />
      ) : null}

      {actions.confirmDelete ? (
        <ConfirmDeleteModal
          label={actions.confirmDelete.label}
          onCancel={() => actions.setConfirmDelete(null)}
          onConfirm={actions.performDelete}
        />
      ) : null}

      {folderConfirm ? (
        <ConfirmDeleteModal
          label={folderConfirm.name}
          onCancel={() => setFolderConfirm(null)}
          onConfirm={confirmDeleteFolder}
        />
      ) : null}
    </div>
  );
};

export default function DataPage() {
  return <DataPageInner />;
}

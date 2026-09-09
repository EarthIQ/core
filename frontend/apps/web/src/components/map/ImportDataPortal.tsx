import { resources, type Resource } from "@modules/resources";
import { Search, Database, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  listDatasets,
  type GeoDatasetOut,
  getVectorTileUrl,
  getGeometrySummaries,
  type GeometrySummary,
} from "@/lib/datasets";

import { nextLayerColor, type NewLayerInput } from "./layer-panel/useLayerTree";

interface ImportDataPortalProps {
  onClose: () => void;
  onImport: (layers: NewLayerInput[], parentId: string | null) => void;
  isAvailableModule: (id: string) => boolean;
  folders: { id: string; name: string }[];
  initialFolderId?: string | null;
}

type TypeFilter = "all" | "vector" | "raster";

export const ImportDataPortal = ({
  onClose,
  onImport,
  isAvailableModule,
  folders,
  initialFolderId = null,
}: ImportDataPortalProps) => {
  const [datasets, setDatasets] = useState<GeoDatasetOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"catalog" | "resource">("catalog");
  const [destFolder, setDestFolder] = useState<string>(initialFolderId ?? "");

  // Resource-module state
  const [resLayers, setResLayers] = useState<Resource[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [resLoaded, setResLoaded] = useState(false);
  // Selected resource ids (namespaced with `res-` to avoid clashing with dataset ids)
  const [resSelected, setResSelected] = useState<Set<string>>(new Set());

  const hasResourceModule =
    isAvailableModule("resources-module") ||
    isAvailableModule("resource-module") ||
    isAvailableModule("hydrology-module");

  useEffect(() => {
    setLoading(true);
    listDatasets()
      .then((items) => {
        setDatasets(items);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load datasets");
        setLoading(false);
      });
  }, []);

  // Lazy-load resource-module layers the first time the tab is opened.
  useEffect(() => {
    if (tab !== "resource" || resLoaded || !hasResourceModule) return;
    setResLoading(true);
    resources
      .list({ only_addable: true })
      .then((items) => {
        setResLayers(items ?? []);
        setResLoaded(true);
        setResLoading(false);
      })
      .catch((e) => {
        setResError(e?.message ?? "Failed to load resource layers");
        setResLoading(false);
      });
  }, [tab, resLoaded, hasResourceModule]);

  const filtered = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const kind =
      d.type === "raster" || d.type === "remote-sensing" ? "raster" : "vector";
    const matchesType = typeFilter === "all" || typeFilter === kind;
    return matchesSearch && matchesType;
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      if (filtered.every((d) => prev.has(d.id))) return new Set();
      return new Set(filtered.map((d) => d.id));
    });
  }

  /* ── Resource-module helpers ─────────────────────────────── */
  const resKey = (r: Resource) => `res-${r.id}`;

  const filteredRes = resLayers.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${r.name} ${r.short_description} ${r.provider} ${r.tags.join(
        " "
      )}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (typeFilter === "raster" && r.data_type !== "raster") return false;
    if (typeFilter === "vector" && r.data_type !== "vector") return false;
    return true;
  });

  const allResSelected =
    filteredRes.length > 0 &&
    filteredRes.every((r) => resSelected.has(resKey(r)));

  function toggleRes(r: Resource) {
    const key = resKey(r);
    setResSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleResAll() {
    setResSelected((prev) => {
      if (filteredRes.every((r) => prev.has(resKey(r)))) {
        const next = new Set(prev);
        filteredRes.forEach((r) => next.delete(resKey(r)));
        return next;
      }
      const next = new Set(prev);
      filteredRes.forEach((r) => next.add(resKey(r)));
      return next;
    });
  }

  const totalSelected = selected.size + resSelected.size;

  async function handleImport() {
    const toLayers: NewLayerInput[] = [];

    // Geometry profiles (dominant point/line/polygon) for the selected
    // catalog vector datasets - best effort; import proceeds without them.
    const isRasterType = (d: GeoDatasetOut) =>
      d.type === "raster" || d.type === "remote-sensing";
    const vectorDatasetIds = datasets
      .filter((d) => selected.has(d.id) && !isRasterType(d))
      .map((d) => d.id);
    let geometry: Record<string, GeometrySummary> = {};
    if (vectorDatasetIds.length > 0) {
      try {
        geometry = await getGeometrySummaries(vectorDatasetIds);
      } catch {
        geometry = {};
      }
    }

    // Catalog datasets
    datasets
      .filter((d) => selected.has(d.id))
      .forEach((d) =>
        toLayers.push({
          id: d.id,
          name: d.name,
          layerType: isRasterType(d) ? "raster" : "vector",
          visible: true,
          tileUrl: d.type === "vector" ? getVectorTileUrl(d.id) : undefined,
          datasetId: d.id,
          geometryType: !isRasterType(d)
            ? (geometry[d.id]?.dominant ?? undefined)
            : undefined,
          color: nextLayerColor(),
          opacity: 0.8,
          lineWidth: 2,
          source: "catalog",
        })
      );

    // Resource-module layers (live tile-service raster layers)
    resLayers
      .filter((r) => resSelected.has(resKey(r)) && r.service?.tile_url)
      .forEach((r) =>
        toLayers.push({
          id: resKey(r),
          name: r.name,
          layerType: "raster",
          visible: true,
          tileUrl: r.service.tile_url,
          color: nextLayerColor(),
          opacity: r.suggested_opacity ?? 0.8,
          source: "resource",
        })
      );

    onImport(toLayers, destFolder || null);
    onClose();
  }

  const formatIcon = (f: string) => {
    if (f === "GeoJSON") return "🟢";
    if (f === "GeoTIFF" || f === "COG") return "🛰️";
    if (f === "Shapefile") return "🔷";
    if (f === "CSV") return "📑";
    return "📦";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(8,13,20,0.7)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-elevated border-border-primary relative flex w-full max-w-xl flex-col rounded-2xl border shadow-2xl"
        style={{ maxHeight: "84vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border-secondary flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Database
              className="text-primary"
              size={18}
            />
            <div>
              <div className="text-text-primary text-sm font-bold">
                Import Data to Map
              </div>
              <div className="text-text-tertiary text-[0.7rem]">
                Select datasets to visualize on the map
              </div>
            </div>
          </div>
          <button
            className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-colors"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {hasResourceModule ? (
          <div className="flex shrink-0 gap-1 px-5 pt-3">
            {(["catalog", "resource"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  tab === t
                    ? "bg-primary/15 text-primary border-primary/30 border"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "catalog" ? "📦 Data Catalog" : "🧩 Resource Module"}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-2 px-5 pt-3 pb-2">
          <div className="bg-surface-hover border-border-secondary flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <Search
              className="text-text-tertiary shrink-0"
              size={14}
            />
            <input
              className="text-text-primary placeholder:text-text-quaternary w-full border-none bg-transparent text-xs outline-none"
              placeholder="Search datasets…"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "vector", "raster"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-primary/15 text-primary border-primary/30 border"
                    : "text-text-tertiary hover:bg-surface-hover border border-transparent"
                }`}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
            <div className="flex-1" />
            {tab === "resource" ? (
              filteredRes.length > 0 && (
                <button
                  className="text-primary text-[0.68rem] underline"
                  type="button"
                  onClick={toggleResAll}
                >
                  {allResSelected ? "Deselect all" : "Select all"}
                </button>
              )
            ) : filtered.length > 0 ? (
              <button
                className="text-primary text-[0.68rem] underline"
                type="button"
                onClick={toggleSelectAll}
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 scrollbar-thin overflow-y-auto px-5 pb-2">
          {loading ? (
            <div className="flex flex-col gap-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface-hover h-12 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : error ? (
            <div className="py-6 text-center text-xs text-red-400">{error}</div>
          ) : tab === "resource" ? (
            resLoading ? (
              <div className="flex flex-col gap-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-hover h-14 animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : resError ? (
              <div className="py-6 text-center text-xs text-red-400">
                {resError}
              </div>
            ) : filteredRes.length === 0 ? (
              <div className="text-text-tertiary py-8 text-center text-xs">
                <span className="mb-2 block text-2xl">🧩</span>
                No addable layers in the Resource Module right now.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 py-2">
                {filteredRes.map((r) => {
                  const isSelected = resSelected.has(resKey(r));
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 text-text-primary"
                          : "border-border-secondary hover:bg-surface-hover text-text-secondary bg-transparent"
                      }`}
                      onClick={() => toggleRes(r)}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          isSelected
                            ? "bg-primary border-primary text-bg-primary"
                            : "border-border-primary"
                        }`}
                      >
                        {isSelected ? (
                          <svg
                            fill="none"
                            height="10"
                            viewBox="0 0 10 10"
                            width="10"
                          >
                            <path
                              d="M2 5l2.5 2.5L8 3"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            />
                          </svg>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-base">🗺️</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-text-primary truncate text-xs font-semibold">
                          {r.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-text-quaternary text-[0.65rem]">
                            {r.service?.protocol?.toUpperCase() ?? r.format}
                          </span>
                          <span className="text-border-primary">·</span>
                          <span className="text-text-quaternary text-[0.65rem]">
                            {r.provider}
                          </span>
                          {r.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="rounded-full px-1.5 py-0.5 text-[0.6rem]"
                              style={{
                                background: "rgba(34,211,160,0.1)",
                                color: "var(--eq-accent)",
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className="text-text-quaternary shrink-0 text-[0.6rem]"
                        title={r.short_description}
                      >
                        Live layer
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="text-text-tertiary py-8 text-center text-xs">
              <span className="mb-2 block text-2xl">📭</span>
              No datasets found.{" "}
              <a
                className="text-primary underline"
                href="/data"
              >
                Upload one in Data Hub →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 py-2">
              {filtered.map((ds) => {
                const isSelected = selected.has(ds.id);
                return (
                  <button
                    key={ds.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-text-primary"
                        : "border-border-secondary hover:bg-surface-hover text-text-secondary bg-transparent"
                    }`}
                    onClick={() => toggleSelect(ds.id)}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                        isSelected
                          ? "bg-primary border-primary text-bg-primary"
                          : "border-border-primary"
                      }`}
                    >
                      {isSelected ? (
                        <svg
                          fill="none"
                          height="10"
                          viewBox="0 0 10 10"
                          width="10"
                        >
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                          />
                        </svg>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-base">
                      {formatIcon(ds.format)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary truncate text-xs font-semibold">
                        {ds.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-text-quaternary text-[0.65rem]">
                          {ds.format}
                        </span>
                        {ds.feature_count !== null && (
                          <>
                            <span className="text-border-primary">·</span>
                            <span className="text-text-quaternary text-[0.65rem]">
                              {ds.feature_count.toLocaleString()} features
                            </span>
                          </>
                        )}
                        {ds.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-1.5 py-0.5 text-[0.6rem]"
                            style={{
                              background: "rgba(34,211,160,0.1)",
                              color: "var(--eq-accent)",
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {ds.type === "vector" && (
                      <span className="text-text-quaternary shrink-0 text-[0.6rem]">
                        MVT ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-border-secondary flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-text-tertiary shrink-0 text-xs">
              {totalSelected} selected
            </span>
            {folders.length > 0 && (
              <select
                className="bg-surface-hover border-border-secondary text-text-secondary min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[0.7rem] outline-none"
                value={destFolder}
                onChange={(e) => setDestFolder(e.target.value)}
              >
                <option value="">📍 Root (no folder)</option>
                {folders.map((f) => (
                  <option
                    key={f.id}
                    value={f.id}
                  >
                    📁 {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="text-text-secondary hover:bg-surface-hover border-border-secondary rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              disabled={totalSelected === 0}
              type="button"
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                totalSelected === 0
                  ? "bg-surface-hover text-text-quaternary cursor-not-allowed"
                  : "bg-primary text-bg-primary hover:opacity-90"
              }`}
              onClick={handleImport}
            >
              Add to Map ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

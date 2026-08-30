import { useEffect, useState } from "react";
import { Search, Database, X } from "lucide-react";
import {
  listDatasets,
  GeoDatasetOut,
  getVectorTileUrl,
  getGeometrySummaries,
  GeometrySummary,
} from "@/lib/datasets";
import { nextLayerColor, type NewLayerInput } from "./layer-panel/useLayerTree";
import { resources, type Resource } from "@modules/resources";

interface ImportDataPortalProps {
  onClose: () => void;
  onImport: (layers: NewLayerInput[], parentId: string | null) => void;
  isAvailableModule: (id: string) => boolean;
  folders: { id: string; name: string }[];
  initialFolderId?: string | null;
}

type TypeFilter = "all" | "vector" | "raster";

export function ImportDataPortal({
  onClose,
  onImport,
  isAvailableModule,
  folders,
  initialFolderId = null,
}: ImportDataPortalProps) {
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
      next.has(id) ? next.delete(id) : next.add(id);
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
        " ",
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
      next.has(key) ? next.delete(key) : next.add(key);
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
    // catalog vector datasets — best effort; import proceeds without them.
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
        }),
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
          tileUrl: r.service!.tile_url,
          color: nextLayerColor(),
          opacity: r.suggested_opacity ?? 0.8,
          source: "resource",
        }),
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
        className="relative w-full max-w-xl bg-elevated border border-border-primary rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "84vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-secondary shrink-0">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-primary" />
            <div>
              <div className="text-sm font-bold text-text-primary">
                Import Data to Map
              </div>
              <div className="text-[0.7rem] text-text-tertiary">
                Select datasets to visualize on the map
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {hasResourceModule && (
          <div className="flex gap-1 px-5 pt-3 shrink-0">
            {(["catalog", "resource"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {t === "catalog" ? "📦 Data Catalog" : "🧩 Resource Module"}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 pt-3 pb-2 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-surface-hover border border-border-secondary rounded-lg px-3 py-1.5">
            <Search size={14} className="text-text-tertiary shrink-0" />
            <input
              type="text"
              placeholder="Search datasets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-text-primary placeholder:text-text-quaternary w-full"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "vector", "raster"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-full text-[0.68rem] font-semibold capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-text-tertiary border border-transparent hover:bg-surface-hover"
                }`}
              >
                {t}
              </button>
            ))}
            <div className="flex-1" />
            {tab === "resource" ? (
              filteredRes.length > 0 && (
                <button
                  type="button"
                  onClick={toggleResAll}
                  className="text-[0.68rem] text-primary underline"
                >
                  {allResSelected ? "Deselect all" : "Select all"}
                </button>
              )
            ) : filtered.length > 0 ? (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[0.68rem] text-primary underline"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col gap-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-surface-hover animate-pulse"
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
                    className="h-14 rounded-lg bg-surface-hover animate-pulse"
                  />
                ))}
              </div>
            ) : resError ? (
              <div className="py-6 text-center text-xs text-red-400">
                {resError}
              </div>
            ) : filteredRes.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-tertiary">
                <span className="text-2xl block mb-2">🧩</span>
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
                      onClick={() => toggleRes(r)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 text-text-primary"
                          : "bg-transparent border-border-secondary hover:bg-surface-hover text-text-secondary"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-primary border-primary text-bg-primary"
                            : "border-border-primary"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <path
                              d="M2 5l2.5 2.5L8 3"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-base shrink-0">🗺️</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-primary truncate">
                          {r.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[0.65rem] text-text-quaternary">
                            {r.service?.protocol?.toUpperCase() ?? r.format}
                          </span>
                          <span className="text-border-primary">·</span>
                          <span className="text-[0.65rem] text-text-quaternary">
                            {r.provider}
                          </span>
                          {r.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[0.6rem] px-1.5 py-0.5 rounded-full"
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
                        className="text-[0.6rem] text-text-quaternary shrink-0"
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
            <div className="py-8 text-center text-xs text-text-tertiary">
              <span className="text-2xl block mb-2">📭</span>
              No datasets found.{" "}
              <a href="/data" className="text-primary underline">
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
                    onClick={() => toggleSelect(ds.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/40 text-text-primary"
                        : "bg-transparent border-border-secondary hover:bg-surface-hover text-text-secondary"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-primary border-primary text-bg-primary"
                          : "border-border-primary"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                        >
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-base shrink-0">
                      {formatIcon(ds.format)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary truncate">
                        {ds.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[0.65rem] text-text-quaternary">
                          {ds.format}
                        </span>
                        {ds.feature_count !== null && (
                          <>
                            <span className="text-border-primary">·</span>
                            <span className="text-[0.65rem] text-text-quaternary">
                              {ds.feature_count.toLocaleString()} features
                            </span>
                          </>
                        )}
                        {ds.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[0.6rem] px-1.5 py-0.5 rounded-full"
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
                      <span className="text-[0.6rem] text-text-quaternary shrink-0">
                        MVT ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border-secondary shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-text-tertiary shrink-0">
              {totalSelected} selected
            </span>
            {folders.length > 0 && (
              <select
                value={destFolder}
                onChange={(e) => setDestFolder(e.target.value)}
                className="flex-1 min-w-0 text-[0.7rem] bg-surface-hover border border-border-secondary rounded-lg px-2 py-1.5 text-text-secondary outline-none"
              >
                <option value="">📍 Root (no folder)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-surface-hover border border-border-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={totalSelected === 0}
              onClick={handleImport}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                totalSelected === 0
                  ? "bg-surface-hover text-text-quaternary cursor-not-allowed"
                  : "bg-primary text-bg-primary hover:opacity-90"
              }`}
            >
              Add to Map ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

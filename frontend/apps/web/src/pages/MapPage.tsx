import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { deleteMap, updateMap, MapItem } from "@/lib/maps";
import {
  fetchProjectById,
  updateProject,
  publishMapFromProject,
  ProjectItem,
} from "@/lib/projects";
import { useModules } from "@/lib/modules";
import AIChatPanel from "@/components/map/AIChatPanel";
import { MapNavbar } from "@/components/map/MapNavbar";
import { MapBottomBar, TERRAIN_SOURCE_ID, TERRAIN_SOURCE_URL, TERRAIN_EXAGGERATION } from "@/components/map/MapBottomBar";
import { MapActionBar } from "@/components/map/MapActionBar";
import { StylePanel } from "@/components/map/StylePanel";
import { ImportDataPortal } from "@/components/map/ImportDataPortal";
import { LayerPanel } from "@/components/map/layer-panel/LayerPanel";
import { LayerDndProvider } from "@/components/map/layer-panel/dndContext";
import {
  useLayerTree,
  type NewLayerInput,
} from "@/components/map/layer-panel/useLayerTree";
import {
  toMapLayerItems,
  fromMapLayerItems,
} from "@/components/map/layer-panel/serialize";
import type { TreeNode, LayerTreeNode } from "@/components/map/layer-panel/types";
import { useMapLibre, BASEMAP_STYLES } from "@/hooks/useMapLibre";
import { PublishedMapsPanel } from "@/components/map/PublishedMapsPanel";
import type { MapBuilderConfig } from "@/components/map/MapBuilder";
import { useCollaboration } from "@/lib/useCollaboration";
import { CollaboratorCursors } from "@/components/map/CollaboratorCursors";
import { AccessRequestCard } from "@/components/map/share/AccessRequestCard";
import { ApiError } from "@/lib/api";
import {
  useMapEditor,
  selectCanUndo,
  selectCanRedo,
  selectSessionActive,
} from "@/lib/mapEditor/store";
import {
  uploadDataset,
  getVectorTileUrl,
  getGeometrySummary,
  getDatasetFeatures,
  replaceDatasetFeatures,
} from "@/lib/datasets";
import { useMapTools } from "@/hooks/useMapTools";
import { useMapDrawing } from "@/hooks/useMapDrawing";
import { AnnotationOverlays } from "@/components/map/AnnotationOverlays";
import { AnnotationInspector } from "@/components/map/AnnotationInspector";
import { BookmarkPanel } from "@/components/map/BookmarkPanel";
import { CommentsPanel } from "@/components/map/CommentsPanel";
import {
  ToolboxPanel,
  TOOLBOX_PANEL_WIDTH,
} from "@/components/map/ToolboxPanel";
import {
  Map as MapCanvas,
  MapProvider,
  ScaleControl,
  ContextMenuControl,
} from "@packages/map";
import { Spinner } from "@packages/ui";

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const navigate = useNavigate();

  /** Live maplibre instance, set by the <Map> primitive's onLoad. */
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(
    null,
  );
  const [publishedMaps, setPublishedMaps] = useState<MapItem[]>([]);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);
  const [importPortalOpen, setImportPortalOpen] = useState(false);
  const [importDestFolder, setImportDestFolder] = useState<string | null>(null);
  const [styledLayer, setStyledLayer] = useState<TreeNode | null>(null);
  const [publishedPanelOpen, setPublishedPanelOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  /** True when the backend refused access to this project (403). */
  const [projectDenied, setProjectDenied] = useState(false);

  const { isAvailable } = useModules();

  // If the Map builder was opened from the builder picker (?panel=published),
  // open the published maps panel on arrival — the "Maps" behaviour from
  // before. Re-runs whenever the URL query changes so clicking Map again
  // while already on /map also brings the published maps up.
  useEffect(() => {
    if (searchParams.get("panel") === "published") {
      setPublishedPanelOpen(true);
    }
  }, [searchParams]);

  const {
    mapRef,
    mapReady,
    zoomLevel,
    bearing,
    basemap,
    setBasemap,
    flyOrQueue,
    zoomIn,
    zoomOut,
    resetNorth,
  } = useMapLibre(mapInstance, "opentopomap");

  const tree = useLayerTree([]);

  /** True while 3D terrain (bottom-bar toggle) is active. */
  const [terrainOn, setTerrainOn] = useState(false);

  /**
   * Basemap switch wrapper. MapLibre v6 clears terrain whenever a new style
   * is loaded (styles carry no terrain), so re-apply it after the new
   * style finishes loading when terrain is on. The source id/URL must match
   * the `TerrainControl` props in MapBottomBar.
   */
  const handleBasemapChange = useCallback(
    (id: string) => {
      setBasemap(id);
      if (!terrainOn) return;
      const map = mapRef.current;
      if (!map) return;
      const reapply = () => {
        try {
          if (!map.getSource(TERRAIN_SOURCE_ID)) {
            map.addSource(TERRAIN_SOURCE_ID, {
              type: "raster-dem",
              tiles: [TERRAIN_SOURCE_URL],
              encoding: "terrarium",
              tileSize: 512,
              maxzoom: 14,
            });
          }
          map.setTerrain({
            source: TERRAIN_SOURCE_ID,
            exaggeration: TERRAIN_EXAGGERATION,
          });
        } catch (e) {
          console.warn("Failed to re-apply terrain after basemap switch", e);
        }
      };
      if (map.isStyleLoaded?.()) reapply();
      else map.once("style.load", reapply);
    },
    [setBasemap, terrainOn, mapRef],
  );

  // ── Real-time collaboration ──────────────────────────────────────────────────
  const { collaborators, isConnected: isCollabConnected } = useCollaboration(
    projectId,
    mapRef,
    mapReady,
  );

  // ── Map drawing / annotation engine ──────────────────────────────────────────
  useMapTools(mapRef, mapReady);
  // TerraDraw draw engine (Draw group) with shared undo/redo (mapEditor store)
  useMapDrawing(mapInstance, mapReady);

  // Map editor state (tools, annotations, bookmarks, comments, history)
  const activeTool = useMapEditor((s) => s.activeTool);
  const setActiveTool = useMapEditor((s) => s.setActiveTool);
  const bookmarkActive = useMapEditor((s) => s.bookmarkOpen);
  const setBookmarkOpen = useMapEditor((s) => s.setBookmarkOpen);
  const commentsActive = useMapEditor((s) => s.commentsOpen);
  const setCommentsOpen = useMapEditor((s) => s.setCommentsOpen);
  const canUndo = useMapEditor(selectCanUndo);
  const canRedo = useMapEditor(selectCanRedo);
  const undo = useMapEditor((s) => s.undo);
  const redo = useMapEditor((s) => s.redo);
  const clearAnnotations = useMapEditor((s) => s.clearAnnotations);
  const hydrate = useMapEditor((s) => s.hydrate);
  const storeAnnotations = useMapEditor((s) => s.annotations);
  const storeBookmarks = useMapEditor((s) => s.bookmarks);
  const storeComments = useMapEditor((s) => s.comments);
  const sessionActive = useMapEditor(selectSessionActive);
  const drawSessionDetail = useMapEditor((s) => s.drawSession);
  const drawnFeatures = useMapEditor((s) => s.drawnFeatures);

  const addLayers = tree.addLayers;
  const patchLayer = tree.patchLayer;
  const removeNode = tree.removeNode;

  /* ── Shape draw-sessions ──────────────────────────────────────────────────
     - create: the first committed shape spawns a pending "Drawings" layer in
       the panel; Save uploads the shapes as a dataset and the layer becomes
       a real vector layer (the panel node is patched in place).
     - edit:   a saved vector layer's features are loaded into the TerraDraw
       editor (add / modify / delete); Save writes them back to the dataset.
     While a session is active the action bar shows Save + Undo/Redo; after
     Save they all disappear. ──────────────────────────────────────────────── */
  const [drawSaving, setDrawSaving] = useState(false);
  const [layerEditBusy, setLayerEditBusy] = useState<string | null>(null);

  // Create-session: starts when the first shape is committed.
  useEffect(() => {
    if (drawnFeatures.length === 0) return;
    if (useMapEditor.getState().drawSession) return;
    const nodeId = `drawn_${Date.now().toString(36)}`;
    addLayers([
      {
        id: nodeId,
        name: "Drawings",
        layerType: "vector",
        visible: true,
        pending: true,
      },
    ]);
    useMapEditor.getState().startDrawSession({
      mode: "create",
      layerNodeId: nodeId,
    });
  }, [drawnFeatures.length, addLayers]);

  // Create-session: ends again if every drawn shape is removed (e.g. undo).
  useEffect(() => {
    if (drawnFeatures.length !== 0) return;
    const s = useMapEditor.getState().drawSession;
    if (!s || s.mode !== "create") return;
    removeNode(s.layerNodeId);
    useMapEditor.getState().endDrawSession();
  }, [drawnFeatures.length, removeNode]);

  /** Save the active draw-session (new layer → upload; edit → replace). */
  const handleSaveDrawings = useCallback(async () => {
    const store = useMapEditor.getState();
    const session = store.drawSession;
    const features = store.drawnFeatures;
    if (!session || drawSaving) return;
    if (session.mode === "create" && features.length === 0) return;
    setDrawSaving(true);
    try {
      if (session.mode === "create") {
        const file = new File(
          [JSON.stringify({ type: "FeatureCollection", features })],
          "drawings.geojson",
          { type: "application/geo+json" },
        );
        const ds = await uploadDataset({
          file,
          format: "GeoJSON",
          type: "vector",
          tags: "drawn,map-editor",
          description: "Shapes drawn on the map",
          source: "map-drawing",
        });
        let geometryType: "point" | "line" | "polygon" | undefined;
        try {
          geometryType =
            (await getGeometrySummary(ds.id)).dominant ?? undefined;
        } catch {
          geometryType = undefined;
        }
        const node = tree.getNode(session.layerNodeId);
        patchLayer(session.layerNodeId, {
          datasetId: ds.id,
          tileUrl: getVectorTileUrl(ds.id),
          geometryType,
          source: "uploaded",
          pending: false,
        });
        setStatusMsg(
          `Saved ${features.length} shape${
            features.length === 1 ? "" : "s"
          } to "${node?.name ?? "Drawings"}"`,
        );
      } else if (session.datasetId) {
        await replaceDatasetFeatures(session.datasetId, features);
        const node = tree.getNode(session.layerNodeId) as
          | LayerTreeNode
          | undefined;
        const base =
          node?.tileUrl?.split("?")[0] ?? getVectorTileUrl(session.datasetId);
        // Cache-bust the MVT tiles so edited geometry renders immediately.
        patchLayer(session.layerNodeId, {
          tileUrl: `${base}?v=${Date.now()}`,
          visible: session.wasVisible ?? true,
        });
        setStatusMsg(`Saved edits to "${node?.name ?? "layer"}"`);
      }
      useMapEditor.getState().endDrawSession();
      window.setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Failed to save shapes:", err);
      setStatusMsg(
        err instanceof Error ? err.message : "Failed to save shapes",
      );
      window.setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setDrawSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawSaving, patchLayer]);

  /** Open a saved vector layer in the TerraDraw editor (add / edit / delete). */
  const handleEditLayer = useCallback(
    async (node: TreeNode) => {
      const layer = node as LayerTreeNode;
      if (layer.layerType !== "vector" || !layer.datasetId) return;
      if (layerEditBusy) return;
      const store = useMapEditor.getState();
      const existing = store.drawSession;
      if (existing && existing.layerNodeId !== layer.id) {
        const discard = window.confirm(
          "You have unsaved drawing changes. Discard them and edit this layer?",
        );
        if (!discard) return;
        if (existing.mode === "create") removeNode(existing.layerNodeId);
        store.endDrawSession();
      }
      setLayerEditBusy(layer.id);
      try {
        const features = await getDatasetFeatures(layer.datasetId);
        store.startDrawSession({
          mode: "edit",
          layerNodeId: layer.id,
          datasetId: layer.datasetId,
          wasVisible: layer.visible,
        });
        store.syncDrawnFeatures(features);
        // Hide the tile rendering while TerraDraw shows the editable features
        // (restored with its original visibility on Save).
        patchLayer(layer.id, { visible: false });
        store.setActiveTool({ groupId: "navigate", variantId: "select" });
        setStatusMsg(
          `Editing "${layer.name}" — drag points to edit, add new shapes, then Save`,
        );
        window.setTimeout(() => setStatusMsg(null), 4000);
      } catch (err) {
        console.error("Failed to load layer for editing:", err);
        setStatusMsg(
          err instanceof Error
            ? err.message
            : "Failed to open layer for editing",
        );
        window.setTimeout(() => setStatusMsg(null), 4000);
      } finally {
        setLayerEditBusy(null);
      }
    },
    [layerEditBusy, removeNode, patchLayer],
  );

  // Keyboard shortcuts: tool selection + undo/redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      // undo / redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      const shiftMap: Record<string, { groupId: string; variantId: string }> = {
        l: { groupId: "annotate", variantId: "link" },
        v: { groupId: "annotate", variantId: "video" },
      };
      const plainMap: Record<string, { groupId: string; variantId: string }> = {
        v: { groupId: "navigate", variantId: "select" },
        s: { groupId: "draw", variantId: "shape" },
        l: { groupId: "draw", variantId: "line" },
        c: { groupId: "draw", variantId: "circle" },
        r: { groupId: "draw", variantId: "rectangle" },
        m: { groupId: "annotate", variantId: "marker" },
        h: { groupId: "annotate", variantId: "highlighter" },
        t: { groupId: "annotate", variantId: "text" },
        n: { groupId: "annotate", variantId: "note" },
        i: { groupId: "annotate", variantId: "image" },
      };
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey && shiftMap[k]) {
        e.preventDefault();
        setActiveTool(shiftMap[k]);
        return;
      }
      if (plainMap[k]) {
        e.preventDefault();
        setActiveTool(plainMap[k]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, setActiveTool]);

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.resize(), 300);
  }, [aiChatOpen, toolboxOpen, mapRef]);

  /* Load selected project workspace */
  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId)
      .then((projData) => {
        setCurrentProject(projData);
        setPublishedMaps(projData.maps || []);
        setBasemap(projData.basemap || "opentopomap");
        tree.setNodes(
          projData.layers_config?.length
            ? fromMapLayerItems(projData.layers_config as any)
            : [],
        );
        // Hydrate annotation/bookmark/comment state from the backend
        // (drawn shapes are in-memory for now → reset to empty)
        hydrate({
          annotations: projData.annotations ?? [],
          bookmarks: projData.bookmarks ?? [],
          comments: projData.comments ?? [],
          drawnFeatures: [],
        });
        flyOrQueue({
          center: [projData.center_lng, projData.center_lat],
          zoom: projData.zoom,
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setProjectDenied(true);
        } else {
          console.error("Failed to load project:", err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Source ids the layer panel created — stale cleanup only ever touches
  // these, so basemap / terrain sources are never removed by accident.
  const panelSources = useRef<Set<string>>(new Set());

  // Synchronize layer tree nodes with MapLibre map sources and layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const removePanelSource = (id: string) => {
      panelSources.current.delete(id);
      try {
        const style = map.getStyle();
        for (const lyr of style?.layers ?? []) {
          if (lyr.source === id && map.getLayer(lyr.id)) map.removeLayer(lyr.id);
        }
        if (map.getSource(id)) map.removeSource(id);
      } catch (err) {
        console.error("Error removing stale map layer/source:", id, err);
      }
    };

    const syncLayers = () => {
      if (!map.isStyleLoaded()) {
        map.once("styledata", syncLayers);
        return;
      }

      const leafLayers = tree.nodes.filter(
        (n) => n.kind === "layer" && (n as any).tileUrl,
      ) as any[];
      const leafIds = new Set(leafLayers.map((l) => l.id));

      // 1. Remove panel sources that are no longer in the tree.
      for (const id of [...panelSources.current]) {
        if (!leafIds.has(id)) removePanelSource(id);
      }

      // 2. Add or update layers (vector renders fill + line + circle so
      //    point / line / polygon datasets all show; raster gets its style).
      leafLayers.forEach((layer) => {
        try {
          const existing = map.getSource(layer.id) as any;

          // Rebuild the source when its URL or kind changed.
          if (existing) {
            const srcKind = existing.type === "vector" ? "vector" : "raster";
            const tiles: string[] = existing.tiles || [];
            if (
              srcKind !== layer.layerType ||
              tiles[0] !== layer.tileUrl
            ) {
              removePanelSource(layer.id);
            }
          }

          const visibility = layer.visible ? "visible" : "none";
          const color = layer.color || "#3b82f6";

          if (layer.layerType === "raster") {
            if (!map.getSource(layer.id)) {
              map.addSource(layer.id, {
                type: "raster",
                tiles: [layer.tileUrl],
                tileSize: 256,
              });
              map.addLayer({
                id: layer.id,
                type: "raster",
                source: layer.id,
                layout: { visibility },
              });
              panelSources.current.add(layer.id);
            }
            if (map.getLayer(layer.id)) {
              map.setLayoutProperty(layer.id, "visibility", visibility);
              map.setPaintProperty(
                layer.id,
                "raster-opacity",
                layer.opacity ?? 0.8,
              );
              map.setPaintProperty(
                layer.id,
                "raster-brightness",
                layer.brightness ?? 1,
              );
              // Panel treats contrast 1 as neutral; MapLibre treats 0 as neutral.
              map.setPaintProperty(
                layer.id,
                "raster-contrast",
                (layer.contrast ?? 1) - 1,
              );
            }
          } else {
            if (!map.getSource(layer.id)) {
              map.addSource(layer.id, {
                type: "vector",
                tiles: [layer.tileUrl],
              });
              map.addLayer({
                id: `${layer.id}-fill`,
                type: "fill",
                source: layer.id,
                "source-layer": "default",
                paint: {
                  "fill-color": color,
                  "fill-opacity": Math.min(0.85, (layer.opacity ?? 0.8) * 0.6),
                },
                layout: { visibility },
              });
              map.addLayer({
                id: `${layer.id}-line`,
                type: "line",
                source: layer.id,
                "source-layer": "default",
                paint: {
                  "line-color": color,
                  "line-width": layer.lineWidth ?? 2,
                  "line-opacity": layer.opacity ?? 0.9,
                },
                layout: { visibility },
              });
              map.addLayer({
                id: `${layer.id}-circle`,
                type: "circle",
                source: layer.id,
                "source-layer": "default",
                paint: {
                  "circle-color": color,
                  "circle-radius": 4 + (layer.lineWidth ?? 2),
                  "circle-stroke-color": "rgba(255,255,255,0.65)",
                  "circle-stroke-width": 1.25,
                  "circle-opacity": layer.opacity ?? 0.9,
                },
                layout: { visibility },
              });
              panelSources.current.add(layer.id);
            }
            for (const suffix of ["fill", "line", "circle"] as const) {
              const layerId = `${layer.id}-${suffix}`;
              if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, "visibility", visibility);
              }
            }
            if (map.getLayer(`${layer.id}-fill`)) {
              map.setPaintProperty(
                `${layer.id}-fill`,
                "fill-color",
                color,
              );
              map.setPaintProperty(
                `${layer.id}-fill`,
                "fill-opacity",
                Math.min(0.85, (layer.opacity ?? 0.8) * 0.6),
              );
              map.setPaintProperty(`${layer.id}-line`, "line-color", color);
              map.setPaintProperty(
                `${layer.id}-line`,
                "line-width",
                layer.lineWidth ?? 2,
              );
              map.setPaintProperty(`${layer.id}-circle`, "circle-color", color);
            }
          }
        } catch (e) {
          console.error("Error syncing layer:", layer.name, e);
        }
      });
    };

    syncLayers();

    map.on("style.load", syncLayers);
    return () => {
      map.off("style.load", syncLayers);
    };
  }, [mapReady, basemap, tree.nodes]);

  function handleImportLayers(
    layers: NewLayerInput[],
    parentId: string | null,
  ) {
    const existingIds = new Set(tree.nodes.map((n) => n.id));
    tree.addLayers(
      layers.filter((l) => !existingIds.has(l.id as string)),
      parentId,
    );
  }

  // Stable ref so the unmount cleanup can always call the latest version
  const saveConfigRef = useRef<() => Promise<void>>(async () => {});
  /** In-flight guard so a debounced save and the unmount save never overlap. */
  const savingRef = useRef(false);

  const handleSaveConfig = useCallback(async () => {
    if (!projectId || !currentProject) return;
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const map = mapRef.current;
      const center = map?.getCenter?.() || {
        lng: currentProject.center_lng,
        lat: currentProject.center_lat,
      };
      const zoom = map?.getZoom ? map.getZoom() : currentProject.zoom;
      const updated = await updateProject(projectId, {
        center_lng: center.lng,
        center_lat: center.lat,
        zoom: Number(zoom.toFixed(2)),
        basemap,
        layers_config: toMapLayerItems(tree.nodes),
        annotations: storeAnnotations,
        bookmarks: storeBookmarks,
        comments: storeComments,
      });
      setCurrentProject(updated);
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      savingRef.current = false;
    }
  }, [projectId, currentProject, basemap, tree.nodes]);

  // Keep ref in sync so the unmount effect can use latest state
  useEffect(() => {
    saveConfigRef.current = handleSaveConfig;
  });

  // Auto-save viewport when the user leaves the page
  useEffect(() => {
    return () => {
      saveConfigRef.current();
    };
  }, []);

  // Debounced auto-save: persist the layer tree (folders + layers) shortly
  // after any change, so work is never lost to a refresh / closed tab. The
  // unmount save above remains as a last resort when navigating away.
  const hasProject = !!currentProject;
  useEffect(() => {
    if (!projectId || !hasProject) return;
    const t = setTimeout(() => {
      void saveConfigRef.current();
    }, 1500);
    return () => clearTimeout(t);
  }, [tree.nodes, projectId, hasProject]);

  // Published maps handlers
  async function handlePublishMap(config: MapBuilderConfig) {
    if (!projectId) return;
    const newMap = await publishMapFromProject(projectId, {
      title: config.title,
      description: config.description,
      center_lng: config.center_lng,
      center_lat: config.center_lat,
      zoom: config.zoom,
      basemap: config.basemap,
      layers_config: config.layers_config,
      is_public: config.is_public,
      widgets_config: config.widgets_config,
    });
    setPublishedMaps([newMap, ...publishedMaps]);
    setStatusMsg("Map published successfully!");
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function handleDeletePublishedMap(mapId: string) {
    await deleteMap(mapId);
    setPublishedMaps(publishedMaps.filter((m) => m.id !== mapId));
    setStatusMsg("Published map deleted.");
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function handleUpdatePublishedMap(
    mapId: string,
    config: MapBuilderConfig,
  ) {
    const updated = await updateMap(mapId, {
      title: config.title,
      description: config.description,
      center_lng: config.center_lng,
      center_lat: config.center_lat,
      zoom: config.zoom,
      basemap: config.basemap,
      layers_config: config.layers_config,
      is_public: config.is_public,
      widgets_config: config.widgets_config,
    });
    setPublishedMaps(publishedMaps.map((m) => (m.id === mapId ? updated : m)));
    setStatusMsg("Published map updated.");
    setTimeout(() => setStatusMsg(null), 3000);
  }

  const canEdit =
    currentProject?.user_permission === "admin" ||
    currentProject?.user_permission === "write";
  const folderOptions = tree.nodes
    .filter((n) => n.kind === "folder")
    .map((f) => ({ id: f.id, name: f.name }));

  // Layers in a shape the AI context (and the `toggle_layer` tool) understands.
  const aiLayers = tree.nodes
    .filter((n) => n.kind === "layer")
    .map((n) => ({
      id: n.id,
      name: n.name,
      type: (n as any).layerType,
      visible: (n as any).visible,
    }));

  /* Google-Docs style: no access → request it (owner is notified by email) */
  if (projectDenied && !currentProject) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-primary p-6">
        <AccessRequestCard entityType="project" entityId={projectId ?? ""} />
      </div>
    );
  }

  return (
    <MapProvider>
      <div className="relative w-full h-full overflow-hidden bg-bg-primary">
        {/* Scale bar (right side) — @packages/map control */}
        <ScaleControl position="top-right" maxWidth={120} unit="metric" />

        <MapNavbar
        projectName={currentProject?.title || "EarthIQ Project"}
        mapId={projectId}
        projectId={projectId}
        availableMaps={[]}
        activeMapId={projectId}
        canManageSharing={currentProject?.user_permission === "admin"}
        mapRef={mapRef}
        mapReady={mapReady}
        onSelectMap={() => {}}
        onBack={async () => {
          await handleSaveConfig();
          navigate("/projects");
        }}
        collaborators={collaborators}
        isCollabConnected={isCollabConnected}
      />

      {/* Map canvas — @packages/map <Map> primitive (provides MapContext to
          package controls and pushes the instance into the outer provider) */}
      <MapCanvas
        style={BASEMAP_STYLES["opentopomap"]}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2.5,
          pitch: 0,
          bearing: 0,
        }}
        attributionControl={false}
        onLoad={setMapInstance}
        loadingIcon={
          <div className="flex items-center gap-3 text-text-tertiary">
            <Spinner size="lg" />
            <span className="text-xs">Loading map…</span>
          </div>
        }
        containerStyle={{
          position: "absolute",
          top: 0,
          right: toolboxOpen ? TOOLBOX_PANEL_WIDTH : 0,
          bottom: 0,
          left: aiChatOpen ? 360 : 0,
          zIndex: 0,
        }}
      />

      {/* Right-click context menu — copy coordinates / center here (map pkg) */}
      <ContextMenuControl coordinateFormat="both" />

      {/* Collaborator cursor overlay — cursors are placed with map.project()
          (canvas-relative), so this box must mirror the map canvas box exactly,
          same as the AnnotationOverlays wrapper below. */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          top: 0,
          right: toolboxOpen ? TOOLBOX_PANEL_WIDTH : 0,
          bottom: 0,
          left: aiChatOpen ? 360 : 0,
        }}
      >
        {mapReady && (
          <CollaboratorCursors collaborators={collaborators} mapRef={mapRef} />
        )}
      </div>

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60 backdrop-blur-sm pointer-events-none">
          <span className="text-xs text-text-tertiary animate-pulse">
            Loading map…
          </span>
        </div>
      )}

      {/* Point annotations overlay (mirrors the map canvas box exactly) */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          top: 0,
          right: toolboxOpen ? TOOLBOX_PANEL_WIDTH : 0,
          bottom: 0,
          left: aiChatOpen ? 360 : 0,
        }}
      >
        <AnnotationOverlays mapRef={mapRef} mapReady={mapReady} />
      </div>

      <LayerDndProvider>
        <LayerPanel
          nodes={tree.nodes}
          childrenOf={tree.childrenOf}
          descendantLayers={tree.descendantLayers}
          onToggleVisibility={tree.toggleVisibility}
          onToggleCollapse={tree.toggleCollapse}
          onOpenStyle={(l) => setStyledLayer(l)}
          onEditLayer={canEdit ? handleEditLayer : undefined}
          onRemoveNode={(id) => {
            tree.removeNode(id);
            if (styledLayer?.id === id) setStyledLayer(null);
          }}
          onRenameNode={tree.renameNode}
          onMoveNode={tree.moveNode}
          onAddFolder={(parentId) => tree.addFolder("New Folder", parentId)}
          onOpenImport={() => {
            setImportDestFolder(null);
            setImportPortalOpen(true);
          }}
          onOpenImportForFolder={(folderId) => {
            setImportDestFolder(folderId);
            setImportPortalOpen(true);
          }}
          canEdit={!!canEdit}
          isAvailableModule={isAvailable}
          aiOpen={aiChatOpen}
        />
      </LayerDndProvider>

      {/* Published Maps Side Panel */}
      {projectId && (
        <PublishedMapsPanel
          maps={publishedMaps}
          projectId={projectId}
          isOpen={publishedPanelOpen}
          onClose={() => setPublishedPanelOpen(false)}
          onPublish={handlePublishMap}
          onDelete={handleDeletePublishedMap}
          onUpdate={handleUpdatePublishedMap}
          canEdit={!!canEdit}
          currentBasemap={basemap}
          currentCenter={[
            currentProject?.center_lng ?? 0,
            currentProject?.center_lat ?? 20,
          ]}
          currentZoom={currentProject?.zoom ?? 2.5}
          currentBearing={bearing}
          currentPitch={0}
          currentLayers={toMapLayerItems(tree.nodes)}
          currentAnnotations={storeAnnotations}
        />
      )}

      {styledLayer && styledLayer.kind === "layer" && (
        <StylePanel
          layer={styledLayer}
          onClose={() => setStyledLayer(null)}
          onChange={(id, patch) => {
            tree.patchLayer(id, patch);
            setStyledLayer((prev) =>
              prev && prev.id === id
                ? ({ ...prev, ...patch } as TreeNode)
                : prev,
            );
          }}
          onRename={(id, name) => tree.renameNode(id, name)}
        />
      )}

      {importPortalOpen && (
        <ImportDataPortal
          folders={folderOptions}
          initialFolderId={importDestFolder}
          onClose={() => setImportPortalOpen(false)}
          onImport={handleImportLayers}
          isAvailableModule={isAvailable}
        />
      )}

      <MapActionBar
        activeTool={activeTool}
        onToolChange={(tool) => setActiveTool(tool)}
        commentsActive={commentsActive}
        onToggleComments={() => {
          setBookmarkOpen(false);
          setCommentsOpen(!commentsActive);
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClearAnnotations={clearAnnotations}
        sessionActive={sessionActive}
        onSave={handleSaveDrawings}
        saving={drawSaving}
        toolboxActive={toolboxOpen}
        onToggleToolbox={() => setToolboxOpen((v) => !v)}
      />

      {/* Shape-session status toast (save success / failure feedback) */}
      {statusMsg && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-elevated border border-base rounded-full shadow-xl px-4 py-2 text-xs text-base animate-fade-in-up whitespace-nowrap max-w-[80vw] overflow-hidden text-ellipsis">
          {statusMsg}
        </div>
      )}

      {/* Annotation inspector (only visible when something is selected) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
        <AnnotationInspector mapRef={mapRef} mapReady={mapReady} />
      </div>

      {/* Bookmark + Comments panels (self-positioning) */}
      <BookmarkPanel mapRef={mapRef} mapReady={mapReady} />
      <CommentsPanel mapRef={mapRef} mapReady={mapReady} />

      {/* Toolbox — tools exposed by enabled modules (auto-discovered) */}
      <ToolboxPanel
        isOpen={toolboxOpen}
        onClose={() => setToolboxOpen(false)}
        mapRef={mapRef}
        mapReady={mapReady}
        basemap={basemap}
        layers={aiLayers}
      />

      <MapBottomBar
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        activeBasemap={basemap}
        onBasemapChange={setBasemap}
        mapReady={mapReady}
        bearing={bearing}
        onResetNorth={resetNorth}
        onToggleAI={() => setAiChatOpen((v) => !v)}
        bookmarkActive={bookmarkActive}
        onToggleBookmark={() => {
          setCommentsOpen(false);
          setBookmarkOpen(!bookmarkActive);
        }}
      />

      <div className="absolute top-14 left-0 bottom-10 z-20">
        <AIChatPanel
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          mapRef={mapRef}
          mapReady={mapReady}
          basemap={basemap}
          setBasemap={setBasemap}
          layers={aiLayers}
          setLayerVisible={(id, visible) => {
            const node = tree.getNode(id);
            if (node?.kind === "layer") tree.patchLayer(id, { visible });
            else tree.toggleVisibility(id);
          }}
        />
      </div>
      </div>
    </MapProvider>
  );
}

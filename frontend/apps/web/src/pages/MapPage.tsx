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
import { MapBottomBar } from "@/components/map/MapBottomBar";
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
import type { TreeNode } from "@/components/map/layer-panel/types";
import { useMapLibre } from "@/hooks/useMapLibre";
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
} from "@/lib/mapEditor/store";
import { useMapTools } from "@/hooks/useMapTools";
import { AnnotationOverlays } from "@/components/map/AnnotationOverlays";
import { AnnotationInspector } from "@/components/map/AnnotationInspector";
import { BookmarkPanel } from "@/components/map/BookmarkPanel";
import { CommentsPanel } from "@/components/map/CommentsPanel";

export default function MapPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const navigate = useNavigate();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(
    null,
  );
  const [publishedMaps, setPublishedMaps] = useState<MapItem[]>([]);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [importPortalOpen, setImportPortalOpen] = useState(false);
  const [importDestFolder, setImportDestFolder] = useState<string | null>(null);
  const [styledLayer, setStyledLayer] = useState<TreeNode | null>(null);
  const [publishedPanelOpen, setPublishedPanelOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  /** True when the backend refused access to this project (403). */
  const [projectDenied, setProjectDenied] = useState(false);

  const { isAvailable } = useModules();

  const {
    mapRef,
    mapReady,
    zoomLevel,
    coords,
    bearing,
    basemap,
    setBasemap,
    flyOrQueue,
    zoomIn,
    zoomOut,
    resetNorth,
  } = useMapLibre(mapContainerRef, "dataviz-dark");

  const tree = useLayerTree([]);

  // ── Real-time collaboration ──────────────────────────────────────────────────
  const { collaborators, isConnected: isCollabConnected } = useCollaboration(
    projectId,
    mapRef,
  );

  // ── Map drawing / annotation engine ──────────────────────────────────────────
  useMapTools(mapRef, mapReady);

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
  }, [aiChatOpen, mapRef]);

  /* Load selected project workspace */
  useEffect(() => {
    if (!projectId) return;
    fetchProjectById(projectId)
      .then((projData) => {
        setCurrentProject(projData);
        setPublishedMaps(projData.maps || []);
        setBasemap(projData.basemap || "dataviz-dark");
        tree.setNodes(
          projData.layers_config?.length
            ? fromMapLayerItems(projData.layers_config as any)
            : [],
        );
        // Hydrate annotation/bookmark/comment state from the backend
        hydrate({
          annotations: projData.annotations ?? [],
          bookmarks: projData.bookmarks ?? [],
          comments: projData.comments ?? [],
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

  // Synchronize layer tree nodes with MapLibre map sources and layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const syncLayers = () => {
      if (!map.isStyleLoaded()) {
        map.once("styledata", syncLayers);
        return;
      }

      const leafLayers = tree.nodes.filter(
        (n) => n.kind === "layer" && (n as any).tileUrl,
      );
      const leafIds = new Set(leafLayers.map((l) => l.id));

      // 1. Remove layers whose URL changed
      leafLayers.forEach((layer: any) => {
        const existingSource = map.getSource(layer.id) as any;
        if (existingSource) {
          const tiles: string[] = existingSource.tiles || [];
          if (tiles[0] !== layer.tileUrl) {
            if (map.getLayer(layer.id)) map.removeLayer(layer.id);
            map.removeSource(layer.id);
          }
        }
      });

      // 2. Remove stale layers not present in the layer tree
      const style = map.getStyle();
      if (style && style.layers) {
        style.layers.forEach((lyr: any) => {
          if (map.getSource(lyr.id) && !leafIds.has(lyr.id)) {
            try {
              if (map.getLayer(lyr.id)) map.removeLayer(lyr.id);
              if (map.getSource(lyr.id)) map.removeSource(lyr.id);
            } catch (err) {
              console.error("Error removing stale map layer/source:", err);
            }
          }
        });
      }

      // 3. Add or update layers
      leafLayers.forEach((layer: any) => {
        try {
          if (!map.getSource(layer.id)) {
            if (layer.layerType === "raster") {
              map.addSource(layer.id, {
                type: "raster",
                tiles: [layer.tileUrl],
                tileSize: 256,
              });
              map.addLayer({
                id: layer.id,
                type: "raster",
                source: layer.id,
                layout: {
                  visibility: layer.visible ? "visible" : "none",
                },
              });
            } else {
              map.addSource(layer.id, {
                type: "vector",
                tiles: [layer.tileUrl],
              });
              map.addLayer({
                id: layer.id,
                type: "fill",
                source: layer.id,
                "source-layer": "default",
                paint: {
                  "fill-color": layer.color || "#3b82f6",
                  "fill-opacity": layer.opacity ?? 0.6,
                },
                layout: {
                  visibility: layer.visible ? "visible" : "none",
                },
              });
            }
          } else {
            const visibility = layer.visible ? "visible" : "none";
            if (map.getLayer(layer.id)) {
              if (
                map.getLayoutProperty(layer.id, "visibility") !== visibility
              ) {
                map.setLayoutProperty(layer.id, "visibility", visibility);
              }
              if (layer.layerType === "vector") {
                map.setPaintProperty(
                  layer.id,
                  "fill-color",
                  layer.color || "#3b82f6",
                );
                map.setPaintProperty(
                  layer.id,
                  "fill-opacity",
                  layer.opacity ?? 0.6,
                );
              }
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

  const handleSaveConfig = useCallback(async () => {
    if (!projectId || !currentProject) return;
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
    <div className="relative w-full h-full overflow-hidden bg-bg-primary">
      <MapNavbar
        projectName={currentProject?.title || "EarthIQ Project"}
        mapId={projectId}
        availableMaps={[]}
        activeMapId={projectId}
        canManageSharing={currentProject?.user_permission === "admin"}
        publishedMapsOpen={publishedPanelOpen}
        publishedMapsCount={publishedMaps.length}
        onTogglePublishedMaps={() => setPublishedPanelOpen((v) => !v)}
        onSelectMap={() => {}}
        onBack={async () => {
          await handleSaveConfig();
          navigate("/projects");
        }}
        collaborators={collaborators}
        isCollabConnected={isCollabConnected}
      />

      <div
        className="absolute z-0 h-full"
        ref={mapContainerRef}
        id="map-canvas"
        style={{ top: 0, right: 0, bottom: 0, left: aiChatOpen ? 360 : 0 }}
      />

      {/* Collaborator cursor overlay — sits just above the map canvas */}
      {mapReady && (
        <CollaboratorCursors collaborators={collaborators} mapRef={mapRef} />
      )}

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
        style={{ top: 0, right: 0, bottom: 0, left: aiChatOpen ? 360 : 0 }}
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
        bookmarkActive={bookmarkActive}
        onToggleBookmark={() => {
          setCommentsOpen(false);
          setBookmarkOpen(!bookmarkActive);
        }}
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
      />

      {/* Annotation inspector (only visible when something is selected) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
        <AnnotationInspector mapRef={mapRef} mapReady={mapReady} />
      </div>

      {/* Bookmark + Comments panels (self-positioning) */}
      <BookmarkPanel mapRef={mapRef} mapReady={mapReady} />
      <CommentsPanel mapRef={mapRef} mapReady={mapReady} />

      <MapBottomBar
        zoomLevel={zoomLevel}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        activeBasemap={basemap}
        onBasemapChange={setBasemap}
        coords={coords}
        mapReady={mapReady}
        bearing={bearing}
        onResetNorth={resetNorth}
        onToggleAI={() => setAiChatOpen((v) => !v)}
      />

      <div className="absolute top-14 left-0 bottom-0 z-20">
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
  );
}

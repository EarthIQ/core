import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchMaps, fetchMapById, updateMap, MapItem } from "@/lib/maps";
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

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mapId = searchParams.get("mapId");
  const navigate = useNavigate();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [availableMaps, setAvailableMaps] = useState<MapItem[]>([]);
  const [currentMap, setCurrentMap] = useState<MapItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [importPortalOpen, setImportPortalOpen] = useState(false);
  const [importDestFolder, setImportDestFolder] = useState<string | null>(null);
  const [styledLayer, setStyledLayer] = useState<TreeNode | null>(null);
  const [bookmarkActive, setBookmarkActive] = useState(false);
  const [commentsActive, setCommentsActive] = useState(false);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

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

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.resize(), 300);
  }, [aiChatOpen, mapRef]);

  /* Fetch available maps */
  useEffect(() => {
    fetchMaps()
      .then((data) => {
        setAvailableMaps(data);
        if (!mapId && data.length > 0) setSearchParams({ mapId: data[0].id });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load selected map */
  useEffect(() => {
    if (!mapId) return;
    fetchMapById(mapId)
      .then((mapData) => {
        setCurrentMap(mapData);
        setBasemap(mapData.basemap || "dataviz-dark");
        tree.setNodes(
          mapData.layers_config?.length
            ? fromMapLayerItems(mapData.layers_config as any)
            : [],
        );
        flyOrQueue({
          center: [mapData.center_lng, mapData.center_lat],
          zoom: mapData.zoom,
        });
      })
      .catch((err) => setStatusMsg("Failed to load map: " + String(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

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

  async function handleSaveConfig() {
    if (!mapId || !currentMap) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const map = mapRef.current;
      const center = map?.getCenter?.() || {
        lng: currentMap.center_lng,
        lat: currentMap.center_lat,
      };
      const zoom = map?.getZoom ? map.getZoom() : currentMap.zoom;
      const updated = await updateMap(mapId, {
        center_lng: center.lng,
        center_lat: center.lat,
        zoom: Number(zoom.toFixed(2)),
        basemap,
        layers_config: toMapLayerItems(tree.nodes),
      });
      setCurrentMap(updated);
      setStatusMsg("Map configuration saved!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg("Save failed: " + String(err));
    } finally {
      setSaving(false);
    }
  }

  const canEdit =
    currentMap?.user_permission === "admin" ||
    currentMap?.user_permission === "write";
  const folderOptions = tree.nodes
    .filter((n) => n.kind === "folder")
    .map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="relative w-full h-full overflow-hidden bg-bg-primary">
      <MapNavbar
        projectName={currentMap?.title || "EarthIQ Map"}
        mapId={mapId}
        availableMaps={availableMaps}
        activeMapId={mapId}
        canManageSharing={currentMap?.user_permission === "admin"}
        onSelectMap={(id) => setSearchParams({ mapId: id })}
        onBack={() => navigate("/projects")}
      />

      <div
        className="absolute z-0 h-full"
        ref={mapContainerRef}
        id="map-canvas"
        style={{ top: 0, right: 0, bottom: 0, left: aiChatOpen ? 360 : 0 }}
      />

      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/60 backdrop-blur-sm pointer-events-none">
          <span className="text-xs text-text-tertiary animate-pulse">
            Loading map…
          </span>
        </div>
      )}

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
          saving={saving}
          onSave={handleSaveConfig}
          statusMsg={statusMsg}
          isAvailableModule={isAvailable}
          aiOpen={aiChatOpen}
        />
      </LayerDndProvider>

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
        onToolChange={(tool) =>
          setActiveAction(`${tool.groupId}:${tool.variantId}`)
        }
        bookmarkActive={bookmarkActive}
        onToggleBookmark={() => setBookmarkActive((v) => !v)}
        commentsActive={commentsActive}
        onToggleComments={() => setCommentsActive((v) => !v)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={() => {
          /* pop undoStack */
        }}
        onRedo={() => {
          /* pop redoStack */
        }}
      />

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
        <AIChatPanel isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      </div>
    </div>
  );
}

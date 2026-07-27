import { useState, useEffect, useCallback, useContext } from "react";
import { MapContext } from "../context/MapContext";
import { StyleUtils } from "../utils/styles";

export interface LayerInfo {
  id: string;
  type: string;
  source: string;
  sourceLayer?: string;
  visible: boolean;
  opacity: number;
  minzoom?: number;
  maxzoom?: number;
}

export const useLayers = (externalMap?: maplibregl.Map | null) => {
  const context = useContext(MapContext);
  const map = externalMap ?? context?.map;
  const isLoaded = externalMap ? true : (context?.isLoaded ?? false);
  const [layers, setLayers] = useState<LayerInfo[]>([]);

  const updateLayers = useCallback(() => {
    if (!map || !isLoaded) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    const layerInfos: LayerInfo[] = style.layers.map((layer) => {
      const visibility = map.getLayoutProperty(layer.id, "visibility");
      const opacity = getLayerOpacity(map, layer.id, layer.type);

      return {
        id: layer.id,
        type: layer.type,
        source: (layer as any).source || "",
        sourceLayer: (layer as any)["source-layer"],
        visible: visibility !== "none",
        opacity,
        minzoom: layer.minzoom,
        maxzoom: layer.maxzoom,
      };
    });

    setLayers(layerInfos);
  }, [map, isLoaded]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    updateLayers();

    map.on("styledata", updateLayers);

    return () => {
      map.off("styledata", updateLayers);
    };
  }, [map, isLoaded, updateLayers]);

  const setLayerVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      if (!map?.getLayer(layerId)) return;
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none"
      );
      updateLayers();
    },
    [map, updateLayers]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      if (!map) return;

      const layer = map.getLayer(layerId);
      if (!layer) return;

      const opacityProp = StyleUtils.getOpacityProperty(layer.type);
      if (opacityProp) {
        map.setPaintProperty(layerId, opacityProp, opacity);
        updateLayers();
      }
    },
    [map, updateLayers]
  );

  // highlight-start
  const getOpacity = useCallback(
    (layerId: string): number => {
      const layer = layers.find((l) => l.id === layerId);
      return layer?.opacity ?? 1;
    },
    [layers]
  );
  // highlight-end

  const moveLayer = useCallback(
    (layerId: string, beforeId?: string) => {
      if (!map?.getLayer(layerId)) return;
      map.moveLayer(layerId, beforeId);
      updateLayers();
    },
    [map, updateLayers]
  );

  const removeLayer = useCallback(
    (layerId: string) => {
      if (!map?.getLayer(layerId)) return;
      map.removeLayer(layerId);
      updateLayers();
    },
    [map, updateLayers]
  );

  return {
    layers,
    setLayerVisibility,
    setLayerOpacity,
    getOpacity,
    moveLayer,
    removeLayer,
    refresh: updateLayers,
  };
};

function getLayerOpacity(
  map: maplibregl.Map,
  layerId: string,
  type: string
): number {
  const opacityProp = StyleUtils.getOpacityProperty(type);
  if (!opacityProp) return 1;

  try {
    return map.getPaintProperty(layerId, opacityProp) ?? 1;
  } catch {
    return 1;
  }
}

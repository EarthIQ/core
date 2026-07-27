// components/ModelLayer/ModelLayer.tsx

import { useEffect, useRef, useMemo, useCallback } from "react";
import { useMap } from "../../../hooks/useMap";
import { useModelLoader } from "./useModelLoader";
import { ModelCustomLayer } from "./ModelCustomLayer";
import type {
  ModelLayerProps,
  ModelFeature,
  ModelInteractionEvent,
} from "./types";

const DEFAULT_LAYER_ID = "model-3d-layer";

export const ModelLayer = ({
  data,
  models: modelDefinitions,
  layerId = DEFAULT_LAYER_ID,
  visible = true,
  lighting,
  performance,
  onLoad,
  onError,
  onClick,
  onHover,
}: ModelLayerProps) => {
  const { map, isLoaded: mapLoaded } = useMap();
  const layerRef = useRef<ModelCustomLayer | null>(null);

  // Keep callbacks in refs to avoid stale closures without re-triggering effects
  const callbackRefs = useRef({ onLoad, onError, onClick, onHover });
  useEffect(() => {
    callbackRefs.current = { onLoad, onError, onClick, onHover };
  }, [onLoad, onError, onClick, onHover]);

  // Extract required model IDs from features
  const requiredModelIds = useMemo(() => {
    const ids = new Set<string>();
    data.features.forEach((f) => ids.add(f.properties.modelId));
    return Array.from(ids);
  }, [data.features]);

  // Filter definitions to only what's needed
  const requiredDefinitions = useMemo(
    () => modelDefinitions.filter((d) => requiredModelIds.includes(d.modelId)),
    [modelDefinitions, requiredModelIds]
  );

  // Load models (globally cached, deduped)
  const {
    loadedModels,
    isLoading,
    error: loadError,
  } = useModelLoader(requiredDefinitions, performance);

  // Propagate errors
  useEffect(() => {
    if (loadError) callbackRefs.current.onError?.(loadError);
  }, [loadError]);

  // ── Create / destroy the custom layer ────────────────────────────────

  useEffect(() => {
    if (!map || !mapLoaded) return;

    const layer = new ModelCustomLayer(
      layerId,
      modelDefinitions,
      lighting,
      performance
    );

    // Wire up interaction callbacks via the layer's public handlers
    layer.onClickHandler = (featureIdx, point, lngLat, originalEvent) => {
      const feature = data.features[featureIdx];
      if (!feature || !callbackRefs.current.onClick) return;
      callbackRefs.current.onClick({
        feature: feature as ModelFeature,
        point,
        lngLat,
        originalEvent,
      });
    };

    layer.onHoverHandler = (featureIdx, point, lngLat, originalEvent) => {
      if (!callbackRefs.current.onHover) return;
      if (featureIdx === null) {
        callbackRefs.current.onHover(null);
        return;
      }
      const feature = data.features[featureIdx];
      if (!feature) return;
      callbackRefs.current.onHover({
        feature: feature as ModelFeature,
        point,
        lngLat,
        originalEvent,
      });
    };

    layerRef.current = layer;
    map.addLayer(layer);

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      layerRef.current = null;
    };
  }, [map, mapLoaded, layerId]); // Intentionally exclude lighting/performance — they require layer recreation

  // ── Push loaded models into the layer ────────────────────────────────

  useEffect(() => {
    if (!layerRef.current || isLoading || loadedModels.size === 0) return;
    layerRef.current.updateModels(loadedModels);
    callbackRefs.current.onLoad?.();
  }, [loadedModels, isLoading]);

  // ── Push feature data into the layer ─────────────────────────────────

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.updateFeatures(data.features as ModelFeature[]);
  }, [data]);

  // ── Push definition changes (e.g., baseScale tweaks at runtime) ──────

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.updateDefinitions(modelDefinitions);
  }, [modelDefinitions]);

  // ── Visibility ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!map || !mapLoaded || !map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  }, [map, mapLoaded, layerId, visible]);

  return null;
};

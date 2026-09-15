/**
 * presentation/useProjectData.ts
 * ------------------------------
 * Loads the source material for a presentation scoped to a project:
 *  - the project itself (which carries its published `maps`)
 *  - the geo-dataset catalog (for chart + table blocks)
 *  - a lazily-filled, cached map of dataset previews (schema + sample rows)
 *
 * Everything is read through the existing typed libs (`@/lib/*`) with the same
 * bearer-token auth; no new endpoints are introduced.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { MapItem } from "@/lib/maps";
import { fetchProjectById, type ProjectItem } from "@/lib/projects";
import {
  listDatasets,
  previewDataset,
  type DatasetPreview,
  type GeoDatasetOut,
} from "@/lib/datasets";

export interface ProjectData {
  project: ProjectItem | null;
  /** Published maps belonging to the project (map block options). */
  maps: MapItem[];
  /** The geo-dataset catalog (chart/table block options). */
  datasets: GeoDatasetOut[];
  /** Cached previews keyed by dataset id. */
  previews: Record<string, DatasetPreview>;
  loading: boolean;
  error: string | null;
  /** Fetch (and cache) a bounded preview for a dataset. */
  getPreview: (datasetId: string, maxRows?: number) => Promise<DatasetPreview>;
}

export function useProjectData(projectId: string): ProjectData {
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [datasets, setDatasets] = useState<GeoDatasetOut[]>([]);
  const [previews, setPreviews] = useState<Record<string, DatasetPreview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewCache = useRef<Record<string, DatasetPreview>>({});

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [proj, ds] = await Promise.all([
          fetchProjectById(projectId),
          // Datasets are optional for a deck - a failure shouldn't block the builder.
          listDatasets().catch(() => [] as GeoDatasetOut[]),
        ]);
        if (!active) return;
        setProject(proj);
        setDatasets(ds);
        setPreviews({ ...previewCache.current });
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load project data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  const getPreview = useCallback(
    async (datasetId: string, maxRows = 24): Promise<DatasetPreview> => {
      const cached = previewCache.current[datasetId];
      if (cached) return cached;
      const preview = await previewDataset(datasetId, maxRows);
      previewCache.current[datasetId] = preview;
      setPreviews({ ...previewCache.current });
      return preview;
    },
    []
  );

  return {
    project,
    maps: project?.maps ?? [],
    datasets,
    previews,
    loading,
    error,
    getPreview,
  };
}
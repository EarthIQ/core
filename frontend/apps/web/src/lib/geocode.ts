/**
 * Geocoding — OSM Nominatim via the core backend proxy (`GET /api/geocode`).
 *
 * The public Nominatim API sends no CORS headers and requires a valid
 * server-side User-Agent, so the browser must NOT call it directly; the
 * backend proxy is the single gateway (valid UA + low volume). Used by the
 * shell topbar search to resolve typed queries ("Kathmandu", "Eiffel Tower")
 * into concrete places with coordinates + a suggested map zoom. Show the OSM
 * attribution in the UI (done in the search dropdown).
 */

import { api } from "./api";

export interface PlaceResult {
  place_id: number;
  /** Primary display name (falls back to the first part of display_name). */
  name: string;
  /** Remaining context — the rest of the display name. */
  detail: string;
  lat: number;
  lon: number;
  /** Nominatim feature class (e.g. "boundary", "road", "building"). */
  category: string;
  /** Nominatim feature type (e.g. "administrative", "residential"). */
  type: string;
  /** Suggested MapLibre zoom derived from the result's bounding box. */
  zoom: number;
}

/**
 * Geocode a free-text place query through the backend proxy.
 * Rejects on HTTP/network failure (including AbortError from the caller's
 * signal).
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const lang =
    typeof navigator !== "undefined" && navigator.language
      ? encodeURIComponent(navigator.language)
      : "";
  const params = new URLSearchParams({ q: query });
  if (lang) params.set("lang", lang);
  return api.get<PlaceResult[]>(`/api/geocode?${params.toString()}`, {
    signal,
  });
}
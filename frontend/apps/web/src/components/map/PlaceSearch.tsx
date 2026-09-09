/**
 * PlaceSearch - location search for the map builder.
 *
 * Geocodes free-text queries ("Kathmandu", "Eiffel Tower") through the core
 * backend's OSM Nominatim proxy (`GET /api/v1/geocode`, see `lib/geocode.ts`)
 * and, on selection, flies the live map to the place and drops a labeled
 * marker. Replaces the old dead "Search locations…" input in MapNavbar.
 *
 * Usage policy: debounced (450ms), ≥ 3 chars, in-flight requests are aborted,
 * and the required OSM attribution is shown in the dropdown footer.
 */
import { Spinner } from "@packages/ui";
import { Search, X, MapPin } from "lucide-react";
import { Marker, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import { searchPlaces, type PlaceResult } from "@/lib/geocode";

interface PlaceSearchProps {
  /** Live maplibre instance ref (null until the map is loaded). */
  mapRef: React.MutableRefObject<any>;
  /** True once the map instance is ready. */
  mapReady: boolean;
  className?: string;
}

export const PlaceSearch = ({
  mapRef,
  mapReady,
  className,
}: PlaceSearchProps) => {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const markerRef = useRef<Marker | null>(null);

  // Debounced, cancellable Nominatim search (≥ 3 chars).
  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      abortRef.current?.abort();
      setResults([]);
      setSearching(false);
      setOpen(false);
      return;
    }
    setSearching(true);
    setOpen(true);
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      searchPlaces(q, ctrl.signal)
        .then((found) => {
          if (ctrl.signal.aborted) return;
          setResults(found);
          setActive(0);
          setSearching(false);
        })
        .catch((err) => {
          if (ctrl.signal.aborted) return;
          console.warn("Location search failed:", err);
          setResults([]);
          setSearching(false);
        });
    }, 450);
    return () => clearTimeout(t);
  }, [value]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Abort pending search + remove the marker on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      markerRef.current?.remove();
      markerRef.current = null;
    },
    []
  );

  /** Fly to the place and drop (or move) the labeled marker. */
  const selectPlace = (p: PlaceResult) => {
    abortRef.current?.abort();
    setOpen(false);
    setValue("");
    const map = mapRef.current;
    if (!map) return;
    const zoom = Number.isFinite(p.zoom)
      ? Math.min(19, Math.max(2, p.zoom))
      : 14;
    map.flyTo({ center: [p.lon, p.lat], zoom, duration: 2200 });
    markerRef.current?.remove();
    markerRef.current = new Marker({ color: "#50aad1", scale: 1.1 })
      .setLngLat([p.lon, p.lat])
      .setPopup(new Popup({ offset: 22, closeButton: false }).setText(p.name))
      .addTo(map);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!results.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      if (!results.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active] || results[0];
      if (pick) selectPlace(pick);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      ref={boxRef}
      className={`relative w-full ${className ?? ""}`}
    >
      <div className="bg-surface-hover/50 border-border-secondary hover:border-border-primary relative flex items-center gap-2 rounded-lg border py-1.5 pr-2 pl-3 transition-colors focus-within:border-[var(--input-focus-border)]">
        <Search
          aria-hidden
          className="shrink-0 text-[var(--text-tertiary)]"
          size={15}
        />
        <input
          ref={inputRef}
          aria-expanded={open}
          aria-label="Search locations"
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-xs text-[var(--text-primary)] outline-none"
          placeholder="Search locations…"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {searching ? <Spinner size="xs" /> : null}
        {value ? (
          <button
            aria-label="Clear location search"
            className="shrink-0 cursor-pointer rounded-md p-0.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Results dropdown */}
      {open ? (
        <div className="bg-elevated border-border-primary animate-fade-in-up absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border shadow-xl">
          <div className="max-h-80 overflow-y-auto py-1">
            {searching && results.length === 0 ? (
              <div className="flex items-center gap-2.5 px-3.5 py-4 text-xs text-[var(--text-tertiary)]">
                <Spinner size="xs" />
                Searching locations…
              </div>
            ) : results.length === 0 ? (
              <div className="px-3.5 py-4 text-xs text-[var(--text-tertiary)]">
                No locations found for “{value.trim()}”.
              </div>
            ) : (
              results.map((p, i) => (
                <button
                  key={p.place_id}
                  type="button"
                  className={`flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                    i === active ? "bg-surface-hover" : ""
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlace(p);
                  }}
                >
                  <MapPin
                    size={14}
                    className={`mt-0.5 shrink-0 transition-colors ${
                      i === active
                        ? "text-primary"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs ${
                        i === active
                          ? "font-semibold text-[var(--text-primary)]"
                          : "font-medium text-[var(--text-secondary)]"
                      }`}
                    >
                      {p.name}
                    </span>
                    {p.detail ? (
                      <span className="block truncate text-[0.65rem] text-[var(--text-tertiary)]">
                        {p.detail}
                      </span>
                    ) : null}
                  </span>
                  {!mapReady && (
                    <span className="shrink-0 self-center text-[0.6rem] text-[var(--text-tertiary)]">
                      map loading…
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-border-secondary flex items-center justify-between gap-2 border-t px-3.5 py-2">
            <span className="text-[0.6rem] text-[var(--text-tertiary)]">
              Powered by Nominatim · © OpenStreetMap contributors
            </span>
            <span className="hidden text-[0.6rem] text-[var(--text-tertiary)] sm:block">
              ↑↓ navigate · ↵ fly to
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * PlaceSearch — location search for the map builder.
 *
 * Geocodes free-text queries ("Kathmandu", "Eiffel Tower") through the core
 * backend's OSM Nominatim proxy (`GET /api/geocode`, see `lib/geocode.ts`)
 * and, on selection, flies the live map to the place and drops a labeled
 * marker. Replaces the old dead "Search locations…" input in MapNavbar.
 *
 * Usage policy: debounced (450ms), ≥ 3 chars, in-flight requests are aborted,
 * and the required OSM attribution is shown in the dropdown footer.
 */
import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";
import { Marker, Popup } from "maplibre-gl";
import { Spinner } from "@packages/ui";
import { searchPlaces, type PlaceResult } from "@/lib/geocode";

interface PlaceSearchProps {
  /** Live maplibre instance ref (null until the map is loaded). */
  mapRef: React.MutableRefObject<any>;
  /** True once the map instance is ready. */
  mapReady: boolean;
  className?: string;
}

export function PlaceSearch({ mapRef, mapReady, className }: PlaceSearchProps) {
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
    [],
  );

  /** Fly to the place and drop (or move) the labeled marker. */
  const selectPlace = (p: PlaceResult) => {
    abortRef.current?.abort();
    setOpen(false);
    setValue("");
    const map = mapRef.current;
    if (!map) return;
    const zoom = Number.isFinite(p.zoom) ? Math.min(19, Math.max(2, p.zoom)) : 14;
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
    <div ref={boxRef} className={`relative w-full ${className ?? ""}`}>
      <div className="relative flex items-center gap-2 bg-surface-hover/50 border border-border-secondary rounded-lg pl-3 pr-2 py-1.5 hover:border-border-primary focus-within:border-[var(--input-focus-border)] transition-colors">
        <Search size={15} className="shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search locations…"
          aria-label="Search locations"
          aria-expanded={open}
          className="flex-1 min-w-0 bg-transparent text-xs text-[var(--text-primary)] outline-none border-none p-0"
        />
        {searching && <Spinner size="xs" />}
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            aria-label="Clear location search"
            className="p-0.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-elevated border border-border-primary rounded-xl shadow-xl animate-fade-in-up z-50 overflow-hidden">
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
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPlace(p);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    i === active ? "bg-surface-hover" : ""
                  }`}
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
                    {p.detail && (
                      <span className="block truncate text-[0.65rem] text-[var(--text-tertiary)]">
                        {p.detail}
                      </span>
                    )}
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

          <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-border-secondary">
            <span className="text-[0.6rem] text-[var(--text-tertiary)]">
              Powered by Nominatim · © OpenStreetMap contributors
            </span>
            <span className="hidden sm:block text-[0.6rem] text-[var(--text-tertiary)]">
              ↑↓ navigate · ↵ fly to
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Deck } from "@deck.gl/core";

/**
 * Context value interface for Map state management
 * Provides access to MapLibre and Deck.gl instances throughout the component tree
 */
export interface MapContextValue {
  /** MapLibre GL map instance */
  map: MapLibreMap | null;
  /** Deck.gl instance for advanced visualizations */
  deck: Deck | null;
  /** Whether the map has finished loading */
  isLoaded: boolean;
  /** Update the map instance */
  setMap: (map: MapLibreMap | null) => void;
  /** Update the Deck.gl instance */
  setDeck: (deck: Deck | null) => void;
  /** Update the loaded state */
  setIsLoaded: (loaded: boolean) => void;
}

/**
 * React Context for sharing map state across components
 * @internal
 */
export const MapContext = createContext<MapContextValue | null>(null);

MapContext.displayName = "MapContext";

/**
 * Props for the MapProvider component
 */
export interface MapProviderProps {
  /** Child components that need access to map context */
  children: ReactNode;
}

/**
 * Provider component that manages map state and makes it available to child components
 *
 * @component
 * @example
 * ```tsx
 * <MapProvider>
 *   <Map />
 *   <MapControls />
 * </MapProvider>
 * ```
 */
export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  const [map, setMapState] = useState<MapLibreMap | null>(null);
  const [deck, setDeckState] = useState<Deck | null>(null);
  const [isLoaded, setIsLoadedState] = useState(false);

  const setMap = useCallback((m: MapLibreMap | null) => setMapState(m), []);
  const setDeck = useCallback((d: Deck | null) => setDeckState(d), []);
  const setIsLoaded = useCallback((l: boolean) => setIsLoadedState(l), []);

  const value: MapContextValue = {
    map,
    deck,
    isLoaded,
    setMap,
    setDeck,
    setIsLoaded,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

MapProvider.displayName = "MapProvider";

/**
 * Custom hook to access map context
 * Must be used within a MapProvider or Map component
 *
 * @throws {Error} When used outside of MapProvider
 * @returns {MapContextValue} The map context value
 *
 * @example
 * ```tsx
 * const { map, isLoaded } = useMapContext();
 *
 * useEffect(() => {
 *   if (map && isLoaded) {
 *     map.flyTo({ center: [0, 0], zoom: 5 });
 *   }
 * }, [map, isLoaded]);
 * ```
 */
export const useMapContext = (): MapContextValue => {
  const context = useContext(MapContext);

  if (!context) {
    throw new Error(
      "useMapContext must be used within a MapProvider or Map component. " +
        "Wrap your component tree with <MapProvider> or ensure it's a child of <Map>."
    );
  }

  return context;
};

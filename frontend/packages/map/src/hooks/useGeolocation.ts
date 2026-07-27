import { useState, useEffect, useCallback } from 'react';

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  timestamp: number | null;
}

export interface UseGeolocationOptions {
  /** Enable high accuracy */
  enableHighAccuracy?: boolean;
  /** Timeout in ms */
  timeout?: number;
  /** Max age of cached position in ms */
  maximumAge?: number;
  /** Watch position continuously */
  watch?: boolean;
  /** Auto-start on mount */
  autoStart?: boolean;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
    autoStart = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: false,
    timestamp: null
  });

  const [isWatching, setIsWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge
  };

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      position,
      error: null,
      loading: false,
      timestamp: position.timestamp
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }));
  }, []);

  // Get current position once
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocation not supported',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError,
        loading: false
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, positionOptions);
  }, [handleSuccess, handleError, positionOptions]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;

    setState(prev => ({ ...prev, loading: true }));
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      positionOptions
    );
    setWatchId(id);
    setIsWatching(true);
  }, [handleSuccess, handleError, positionOptions]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsWatching(false);
    }
  }, [watchId]);

  // Auto-start
  useEffect(() => {
    if (autoStart) {
      if (watch) {
        startWatching();
      } else {
        getCurrentPosition();
      }
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [autoStart]);

  return {
    ...state,
    isWatching,
    getCurrentPosition,
    startWatching,
    stopWatching,
    latitude: state.position?.coords.latitude ?? null,
    longitude: state.position?.coords.longitude ?? null,
    accuracy: state.position?.coords.accuracy ?? null,
    altitude: state.position?.coords.altitude ?? null,
    heading: state.position?.coords.heading ?? null,
    speed: state.position?.coords.speed ?? null
  };
};
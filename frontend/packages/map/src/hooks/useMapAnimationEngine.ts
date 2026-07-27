// src/hooks/useMapAnimationEngine.ts

// Change the totalDuration from fixed state to computed value.
// Remove it from TimelineState and compute from keyframes.

import { useCallback, useRef, useState, useEffect } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type {
  Keyframe,
  MapState,
  EasingType,
  TimelineState,
  PlaybackSpeed,
} from "../types/video-export";
import { nanoid } from "nanoid";

const easings: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t * t,
  "ease-out": (t) => 1 - Math.pow(1 - t, 3),
  "ease-in-out": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  "cubic-bezier": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

function interpolateMapState(
  from: MapState,
  to: MapState,
  t: number,
  easing: EasingType
): MapState {
  const e = easings[easing](t);
  let bearingDiff = to.bearing - from.bearing;
  if (bearingDiff > 180) bearingDiff -= 360;
  if (bearingDiff < -180) bearingDiff += 360;
  return {
    center: [
      from.center[0] + (to.center[0] - from.center[0]) * e,
      from.center[1] + (to.center[1] - from.center[1]) * e,
    ],
    zoom: from.zoom + (to.zoom - from.zoom) * e,
    bearing: from.bearing + bearingDiff * e,
    pitch: from.pitch + (to.pitch - from.pitch) * e,
    timestamp: 0,
  };
}

interface UseMapAnimationEngineOptions {
  map: MaplibreMap | null;
  onTimeUpdate?: (time: number) => void;
  onPlaybackEnd?: () => void;
}

export function useMapAnimationEngine({
  map,
  onTimeUpdate,
  onPlaybackEnd,
}: UseMapAnimationEngineOptions) {
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(
    null
  );

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // ── Computed total duration from keyframe durations ──
  // Each keyframe has a `duration` field = seconds to reach the NEXT keyframe.
  // Last keyframe's duration is ignored. Total = sum of all but last.
  const totalDuration = keyframes.reduce(
    (sum, kf, i) => (i < keyframes.length - 1 ? sum + kf.duration : sum),
    0
  );

  // ── Cumulative time at which a keyframe index sits ──
  const getKeyframeTime = useCallback(
    (index: number): number => {
      let t = 0;
      for (let i = 0; i < index && i < keyframes.length - 1; i++) {
        t += keyframes[i].duration;
      }
      return t;
    },
    [keyframes]
  );

  // ── Normalized timestamp (0-1) for a keyframe index ──
  const getKeyframeNormalized = useCallback(
    (index: number): number => {
      if (totalDuration <= 0) return 0;
      return getKeyframeTime(index) / totalDuration;
    },
    [totalDuration, getKeyframeTime]
  );

  const captureMapState = useCallback((): MapState | null => {
    if (!map) return null;
    const center = map.getCenter();
    return {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      timestamp: 0,
    };
  }, [map]);

  // ── Add keyframe — auto adds `durationToNext` seconds ──
  const addKeyframe = useCallback(
    (label?: string, durationToNext = 5) => {
      const state = captureMapState();
      if (!state) return null;

      const keyframe: Keyframe = {
        ...state,
        id: nanoid(8),
        label,
        easing: "ease-in-out",
        duration: durationToNext,
        timestamp: 0, // not used for positioning anymore
      };

      setKeyframes((prev) => [...prev, keyframe]);
      setSelectedKeyframeId(keyframe.id);
      return keyframe.id;
    },
    [captureMapState]
  );

  const removeKeyframe = useCallback(
    (id: string) => {
      setKeyframes((prev) => prev.filter((kf) => kf.id !== id));
      if (selectedKeyframeId === id) setSelectedKeyframeId(null);
    },
    [selectedKeyframeId]
  );

  const updateKeyframe = useCallback(
    (id: string, updates: Partial<Keyframe>) => {
      setKeyframes((prev) =>
        prev.map((kf) => (kf.id === id ? { ...kf, ...updates } : kf))
      );
    },
    []
  );

  const updateKeyframeFromMap = useCallback(
    (id: string) => {
      const state = captureMapState();
      if (!state) return;
      updateKeyframe(id, {
        center: state.center,
        zoom: state.zoom,
        bearing: state.bearing,
        pitch: state.pitch,
      });
    },
    [captureMapState, updateKeyframe]
  );

  const duplicateKeyframe = useCallback((id: string) => {
    setKeyframes((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      if (idx === -1) return prev;
      const copy: Keyframe = {
        ...prev[idx],
        id: nanoid(8),
        label: prev[idx].label ? `${prev[idx].label} (copy)` : undefined,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const reorderKeyframe = useCallback((id: string, dir: -1 | 1) => {
    setKeyframes((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const clearKeyframes = useCallback(() => {
    setKeyframes([]);
    setSelectedKeyframeId(null);
    setCurrentTime(0);
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  // ── Get interpolated state at absolute time (seconds) ──
  const getStateAtTime = useCallback(
    (absoluteTime: number): MapState | null => {
      if (keyframes.length === 0) return null;
      if (keyframes.length === 1) return keyframes[0];

      let elapsed = 0;
      for (let i = 0; i < keyframes.length - 1; i++) {
        const segDur = keyframes[i].duration;
        if (absoluteTime <= elapsed + segDur) {
          const progress = segDur > 0 ? (absoluteTime - elapsed) / segDur : 0;
          return interpolateMapState(
            keyframes[i],
            keyframes[i + 1],
            Math.min(1, progress),
            keyframes[i].easing
          );
        }
        elapsed += segDur;
      }
      return keyframes[keyframes.length - 1];
    },
    [keyframes]
  );

  // ── Overload for export: accepts normalized 0-1 and converts ──
  const getStateAtNormalized = useCallback(
    (normalized: number): MapState | null => {
      return getStateAtTime(normalized * totalDuration);
    },
    [getStateAtTime, totalDuration]
  );

  const applyStateToMap = useCallback(
    (state: MapState) => {
      if (!map) return;
      map.jumpTo({
        center: state.center,
        zoom: state.zoom,
        bearing: state.bearing,
        pitch: state.pitch,
      });
    },
    [map]
  );

  const seekTo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setCurrentTime(clamped);
      pausedAtRef.current = clamped;
      const state = getStateAtTime(clamped);
      if (state) applyStateToMap(state);
      onTimeUpdate?.(clamped);
    },
    [totalDuration, getStateAtTime, applyStateToMap, onTimeUpdate]
  );

  const animate = useCallback(
    (timestamp: number) => {
      const elapsed =
        ((timestamp - startTimeRef.current) / 1000) * playbackSpeed;
      const t = pausedAtRef.current + elapsed;

      if (t >= totalDuration) {
        setCurrentTime(totalDuration);
        setIsPlaying(false);
        setIsPreviewing(false);
        pausedAtRef.current = 0;
        const s = getStateAtTime(totalDuration);
        if (s) applyStateToMap(s);
        onPlaybackEnd?.();
        return;
      }

      setCurrentTime(t);
      const s = getStateAtTime(t);
      if (s) applyStateToMap(s);
      onTimeUpdate?.(t);
      animationRef.current = requestAnimationFrame(animate);
    },
    [
      playbackSpeed,
      totalDuration,
      getStateAtTime,
      applyStateToMap,
      onTimeUpdate,
      onPlaybackEnd,
    ]
  );

  const play = useCallback(() => {
    if (keyframes.length < 2) return;
    if (pausedAtRef.current >= totalDuration) pausedAtRef.current = 0;
    startTimeRef.current = performance.now();
    setIsPlaying(true);
    setIsPreviewing(true);
    animationRef.current = requestAnimationFrame(animate);
  }, [keyframes.length, totalDuration, animate]);

  const pause = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    pausedAtRef.current = currentTime;
    setIsPlaying(false);
    setIsPreviewing(false);
  }, [currentTime]);

  const stop = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    pausedAtRef.current = 0;
    setIsPlaying(false);
    setIsPreviewing(false);
    setCurrentTime(0);
    const s = getStateAtTime(0);
    if (s) applyStateToMap(s);
  }, [getStateAtTime, applyStateToMap]);

  const togglePlayPause = useCallback(
    () => (isPlaying ? pause() : play()),
    [isPlaying, pause, play]
  );

  const stepForward = useCallback(() => {
    seekTo(currentTime + totalDuration / 60);
  }, [currentTime, totalDuration, seekTo]);

  const stepBackward = useCallback(() => {
    seekTo(currentTime - totalDuration / 60);
  }, [currentTime, totalDuration, seekTo]);

  const goToNextKeyframe = useCallback(() => {
    for (let i = 0; i < keyframes.length; i++) {
      const t = getKeyframeTime(i);
      if (t > currentTime + 0.01) {
        seekTo(t);
        setSelectedKeyframeId(keyframes[i].id);
        return;
      }
    }
  }, [keyframes, currentTime, getKeyframeTime, seekTo]);

  const goToPrevKeyframe = useCallback(() => {
    for (let i = keyframes.length - 1; i >= 0; i--) {
      const t = getKeyframeTime(i);
      if (t < currentTime - 0.01) {
        seekTo(t);
        setSelectedKeyframeId(keyframes[i].id);
        return;
      }
    }
  }, [keyframes, currentTime, getKeyframeTime, seekTo]);

  // Build a timeline state object for backward compat
  const timeline: TimelineState = {
    isPlaying,
    isPreviewing,
    isExporting,
    currentTime,
    totalDuration,
    progress: 0,
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return {
    keyframes,
    timeline,
    totalDuration,
    playbackSpeed,
    selectedKeyframeId,
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    updateKeyframeFromMap,
    duplicateKeyframe,
    reorderKeyframe,
    clearKeyframes,
    setSelectedKeyframeId,
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    stepForward,
    stepBackward,
    goToNextKeyframe,
    goToPrevKeyframe,
    setPlaybackSpeed,
    captureMapState,
    getStateAtTime,
    getStateAtNormalized,
    applyStateToMap,
    getKeyframeTime,
    getKeyframeNormalized,
  };
}

// src/hooks/useVideoExport.ts

import { useCallback, useRef, useState } from "react";
import { Map as MaplibreMap } from "maplibre-gl";
import type {
  ExportSettings,
  ExportProgress,
  MapState,
} from "../types/video-export";

interface UseVideoExportOptions {
  map: MaplibreMap | null;
  getStateAtTime: (normalizedTime: number) => MapState | null;
  applyStateToMap: (state: MapState) => void;
}

export function useVideoExport({
  map,
  getStateAtTime,
  applyStateToMap,
}: UseVideoExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress>({
    phase: "done",
    framesCapture: 0,
    totalFrames: 0,
    percentage: 0,
    estimatedTimeRemaining: 0,
  });

  const abortRef = useRef(false);

  const captureFrame = useCallback(async (): Promise<Blob | null> => {
    if (!map) return null;

    const canvas = map.getCanvas();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [map]);

  // Wait for map to be idle after state change
  const waitForMapIdle = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!map) {
        resolve();
        return;
      }

      if (!map.isMoving() && map.areTilesLoaded()) {
        // Additional frame delay to ensure rendering is complete
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
        return;
      }

      const onIdle = () => {
        map.off("idle", onIdle);
        requestAnimationFrame(() => {
          resolve();
        });
      };

      map.on("idle", onIdle);

      // Timeout safety net
      setTimeout(() => {
        map.off("idle", onIdle);
        resolve();
      }, 3000);
    });
  }, [map]);

  // Export as GIF using gif.js
  const exportGif = useCallback(
    async (settings: ExportSettings) => {
      if (!map) return;

      setIsExporting(true);
      abortRef.current = false;

      const totalFrames = Math.ceil(settings.totalDuration * settings.fps);
      const startTime = performance.now();

      setProgress({
        phase: "capturing",
        framesCapture: 0,
        totalFrames,
        percentage: 0,
        estimatedTimeRemaining: 0,
      });

      try {
        // Dynamically import gif.js
        const { default: GIF } = await import("gif.js");

        const gif = new GIF({
          workers: navigator.hardwareConcurrency || 2,
          quality: Math.round((1 - settings.quality) * 20) + 1, // 1-21, lower is better
          width: settings.width,
          height: settings.height,
          workerScript: "/gif.worker.js",
          repeat: settings.loop ? 0 : -1,
        });

        // Preserve original map state
        const originalState = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };

        // Resize map canvas temporarily if needed
        const container = map.getContainer();
        const originalWidth = container.style.width;
        const originalHeight = container.style.height;

        // Capture frames
        for (let frame = 0; frame < totalFrames; frame++) {
          if (abortRef.current) {
            setIsExporting(false);
            setProgress((p) => ({ ...p, phase: "done" }));
            return;
          }

          const normalizedTime = frame / (totalFrames - 1);
          const state = getStateAtTime(normalizedTime);

          if (state) {
            applyStateToMap(state);
            await waitForMapIdle();
          }

          const canvas = map.getCanvas();

          // Create a properly sized canvas
          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = settings.width;
          frameCanvas.height = settings.height;
          const ctx = frameCanvas.getContext("2d")!;
          ctx.drawImage(
            canvas,
            0,
            0,
            canvas.width,
            canvas.height,
            0,
            0,
            settings.width,
            settings.height
          );

          gif.addFrame(frameCanvas, {
            delay: Math.round(1000 / settings.fps),
            copy: true,
          });

          const elapsed = (performance.now() - startTime) / 1000;
          const framesRemaining = totalFrames - frame - 1;
          const timePerFrame = elapsed / (frame + 1);

          setProgress({
            phase: "capturing",
            framesCapture: frame + 1,
            totalFrames,
            percentage: ((frame + 1) / totalFrames) * 80,
            estimatedTimeRemaining: framesRemaining * timePerFrame,
          });
        }

        // Encode
        setProgress((p) => ({ ...p, phase: "encoding", percentage: 85 }));

        await new Promise<void>((resolve, reject) => {
          gif.on("finished", (blob: Blob) => {
            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${settings.filename}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
          });

          gif.on("progress", (p: number) => {
            setProgress((prev) => ({
              ...prev,
              percentage: 85 + p * 15,
            }));
          });

          gif.render();
        });

        // Restore original state
        map.jumpTo({
          center: originalState.center,
          zoom: originalState.zoom,
          bearing: originalState.bearing,
          pitch: originalState.pitch,
        });

        // Restore container size
        container.style.width = originalWidth;
        container.style.height = originalHeight;
        map.resize();

        setProgress({
          phase: "done",
          framesCapture: totalFrames,
          totalFrames,
          percentage: 100,
          estimatedTimeRemaining: 0,
        });
      } catch (error) {
        console.error("GIF export failed:", error);
        setProgress({
          phase: "error",
          framesCapture: 0,
          totalFrames,
          percentage: 0,
          estimatedTimeRemaining: 0,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [map, getStateAtTime, applyStateToMap, waitForMapIdle]
  );

  // Export as video (WebM/MP4) using MediaRecorder or canvas capture
  const exportVideo = useCallback(
    async (settings: ExportSettings) => {
      if (!map) return;

      setIsExporting(true);
      abortRef.current = false;

      const totalFrames = Math.ceil(settings.totalDuration * settings.fps);
      const startTime = performance.now();

      setProgress({
        phase: "capturing",
        framesCapture: 0,
        totalFrames,
        percentage: 0,
        estimatedTimeRemaining: 0,
      });

      try {
        const canvas = map.getCanvas();

        // Create an offscreen canvas for consistent dimensions
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = settings.width;
        outputCanvas.height = settings.height;
        const outputCtx = outputCanvas.getContext("2d")!;

        // Set up MediaRecorder
        const stream = outputCanvas.captureStream(0); // 0 = manual frame control
        const mimeType =
          settings.format === "mp4"
            ? "video/webm;codecs=vp9" // Will be webm but close
            : "video/webm;codecs=vp8";

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported(mimeType)
            ? mimeType
            : "video/webm",
          videoBitsPerSecond: Math.round(settings.quality * 10_000_000),
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        const recordingDone = new Promise<Blob>((resolve) => {
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            resolve(blob);
          };
        });

        mediaRecorder.start();

        // Preserve original state
        const originalState = {
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };

        // Capture frames
        for (let frame = 0; frame < totalFrames; frame++) {
          if (abortRef.current) {
            mediaRecorder.stop();
            setIsExporting(false);
            return;
          }

          const normalizedTime = frame / (totalFrames - 1);
          const state = getStateAtTime(normalizedTime);

          if (state) {
            applyStateToMap(state);
            await waitForMapIdle();
          }

          // Draw to output canvas
          outputCtx.drawImage(
            canvas,
            0,
            0,
            canvas.width,
            canvas.height,
            0,
            0,
            settings.width,
            settings.height
          );

          // Request frame from stream
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && "requestFrame" in videoTrack) {
            (videoTrack as any).requestFrame();
          }

          // Wait for frame interval
          await new Promise((r) =>
            setTimeout(r, Math.round(1000 / settings.fps))
          );

          const elapsed = (performance.now() - startTime) / 1000;
          const framesRemaining = totalFrames - frame - 1;
          const timePerFrame = elapsed / (frame + 1);

          setProgress({
            phase: "capturing",
            framesCapture: frame + 1,
            totalFrames,
            percentage: ((frame + 1) / totalFrames) * 90,
            estimatedTimeRemaining: framesRemaining * timePerFrame,
          });
        }

        setProgress((p) => ({ ...p, phase: "encoding", percentage: 92 }));

        mediaRecorder.stop();
        const blob = await recordingDone;

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${settings.filename}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Restore
        map.jumpTo({
          center: originalState.center,
          zoom: originalState.zoom,
          bearing: originalState.bearing,
          pitch: originalState.pitch,
        });

        setProgress({
          phase: "done",
          framesCapture: totalFrames,
          totalFrames,
          percentage: 100,
          estimatedTimeRemaining: 0,
        });
      } catch (error) {
        console.error("Video export failed:", error);
        setProgress((p) => ({ ...p, phase: "error" }));
      } finally {
        setIsExporting(false);
      }
    },
    [map, getStateAtTime, applyStateToMap, waitForMapIdle]
  );

  const startExport = useCallback(
    async (settings: ExportSettings) => {
      if (settings.format === "gif") {
        await exportGif(settings);
      } else {
        await exportVideo(settings);
      }
    },
    [exportGif, exportVideo]
  );

  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    isExporting,
    progress,
    startExport,
    cancelExport,
  };
}

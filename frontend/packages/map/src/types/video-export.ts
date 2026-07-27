// src/types/video-export.ts

export interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  timestamp: number;
}

export interface Keyframe extends MapState {
  id: string;
  label?: string;
  easing: EasingType;
  duration: number; // seconds to NEXT keyframe (auto 5s on add)
}

export type EasingType =
  | "linear"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "cubic-bezier";

export interface ExportSettings {
  format: "mp4" | "webm" | "gif";
  width: number;
  height: number;
  fps: number;
  quality: number;
  totalDuration: number;
  loop: boolean;
  filename: string;
}

export interface TimelineState {
  isPlaying: boolean;
  isPreviewing: boolean;
  isExporting: boolean;
  currentTime: number;
  totalDuration: number;
  progress: number;
}

export interface ExportProgress {
  phase: "capturing" | "encoding" | "done" | "error";
  framesCapture: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 1.5 | 2 | 4;

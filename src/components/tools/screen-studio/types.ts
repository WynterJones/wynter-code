// Screen Studio Types

export type RecordingState = "idle" | "countdown" | "recording" | "paused" | "completed";

export type RecordingMode = "fullscreen" | "region";

export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Recording {
  id: string;
  blob: Blob | null;
  duration: number;
  timestamp: number;
  thumbnailUrl: string | null;
  metadata: RecordingMetadata;
}

export interface RecordingMetadata {
  width: number;
  height: number;
  fps: number;
  mode: RecordingMode;
  region: RegionSelection | null;
  hasAudio: boolean;
  hasMicrophone: boolean;
}

export interface RecordingSettings {
  quality: "low" | "medium" | "high" | "ultra";
  fps: 30 | 60;
  includeSystemAudio: boolean;
  includeMicrophone: boolean;
  showCursor: boolean;
  showClicks: boolean;
  showKeystrokes: boolean;
  countdownSeconds: number;
  defaultMode: RecordingMode;
  defaultRegion: RegionSelection | null;
}

export interface FlashlightSettings {
  enabled: boolean;
  radius: number;
  opacity: number;
  hotkey: string;
}

export interface ExportFormat {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: "webm", label: "WebM", extension: ".webm", mimeType: "video/webm" },
  { id: "mp4", label: "MP4", extension: ".mp4", mimeType: "video/mp4" },
  { id: "gif", label: "GIF", extension: ".gif", mimeType: "image/gif" },
];

export const DEFAULT_SETTINGS: RecordingSettings = {
  quality: "high",
  fps: 60,
  includeSystemAudio: true,
  includeMicrophone: false,
  showCursor: true,
  showClicks: true,
  showKeystrokes: false,
  countdownSeconds: 3,
  defaultMode: "fullscreen",
  defaultRegion: null,
};

export const DEFAULT_FLASHLIGHT: FlashlightSettings = {
  enabled: false,
  radius: 150,
  opacity: 0.6,
  hotkey: "Option",
};

export type GifRecordingState = "idle" | "selecting" | "recording" | "processing" | "completed";

export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GifRecordingSettings {
  frameRate: number;
  quality: number;
  showCursor: boolean;
  showClicks: boolean;
  loop: boolean;
}

export interface GifRecording {
  id: string;
  blob: Blob | null;
  frames: ImageData[];
  duration: number;
  timestamp: number;
  settings: GifRecordingSettings;
  region: RegionSelection;
}

export const DEFAULT_GIF_SETTINGS: GifRecordingSettings = {
  frameRate: 10,
  quality: 10,
  showCursor: true,
  showClicks: true,
  loop: true,
};

export const FRAME_RATE_OPTIONS = [5, 10, 15, 20, 30];
export const QUALITY_OPTIONS = [
  { value: 5, label: "Low (Smaller file)" },
  { value: 10, label: "Medium" },
  { value: 20, label: "High" },
  { value: 30, label: "Very High (Larger file)" },
];


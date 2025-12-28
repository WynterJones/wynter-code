export interface WebcamDevice {
  deviceId: string;
  label: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatio = "16:9" | "1:1" | "9:16" | "custom";

export type BorderEffect =
  | "none"
  | "rainbow"
  | "pulse-glow"
  | "gradient-wave"
  | "sparkle";

export interface BorderSettings {
  radius: number;
  width: number;
  color: string;
  effect: BorderEffect;
}

export interface ShadowSettings {
  enabled: boolean;
  blur: number;
  spread: number;
  color: string;
  offsetX: number;
  offsetY: number;
}

export interface WebcamSettings {
  deviceId: string | null;
  aspectRatio: AspectRatio;
  cropArea: CropArea;
  border: BorderSettings;
  shadow: ShadowSettings;
  svgMaskUrl: string | null;
}

export interface DecartSettings {
  enabled: boolean;
  apiKey: string;
  activeEffect: string | null;
  customPrompt: string;
  backgroundEffect: "none" | "blur" | "replace";
  backgroundImage: string | null;
}

export interface DecartUsage {
  sessionStartTime: number | null;
  creditsUsed: number;
  costUsd: number;
}

export interface FloatingWindowState {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export const DEFAULT_WEBCAM_SETTINGS: WebcamSettings = {
  deviceId: null,
  aspectRatio: "16:9",
  cropArea: { x: 0, y: 0, width: 1, height: 1 },
  border: {
    radius: 0,
    width: 0,
    color: "#ffffff",
    effect: "none",
  },
  shadow: {
    enabled: false,
    blur: 10,
    spread: 0,
    color: "rgba(0,0,0,0.5)",
    offsetX: 0,
    offsetY: 4,
  },
  svgMaskUrl: null,
};

export const DEFAULT_DECART_SETTINGS: DecartSettings = {
  enabled: false,
  apiKey: "",
  activeEffect: null,
  customPrompt: "",
  backgroundEffect: "none",
  backgroundImage: null,
};

export const ASPECT_RATIO_VALUES: Record<AspectRatio, number | null> = {
  "16:9": 16 / 9,
  "1:1": 1,
  "9:16": 9 / 16,
  custom: null,
};

export const BORDER_EFFECTS: { value: BorderEffect; label: string }[] = [
  { value: "none", label: "None" },
  { value: "rainbow", label: "Rainbow Gradient" },
  { value: "pulse-glow", label: "Pulse Glow" },
  { value: "gradient-wave", label: "Gradient Wave" },
  { value: "sparkle", label: "Sparkle" },
];

export const DECART_STYLE_EFFECTS = [
  { id: "cartoon", label: "Cartoon Style" },
  { id: "oil-painting", label: "Oil Painting" },
  { id: "sketch", label: "Pencil Sketch" },
  { id: "anime", label: "Anime Style" },
  { id: "watercolor", label: "Watercolor" },
] as const;

export const DECART_COST_PER_SECOND = 0.01;

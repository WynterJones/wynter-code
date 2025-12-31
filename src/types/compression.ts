export interface CompressionResult {
  success: boolean;
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  error?: string;
}

export interface ImageEstimateResult {
  originalSize: number;
  estimatedSize: number;
  estimatedSavingsPercent: number;
  format: string;
  targetFormat: string;
  supportsQuality: boolean;
  canConvertToWebp: boolean;
}

export type CompressionType = "archive" | "image" | "pdf" | "video";

export const OPTIMIZABLE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];
const OPTIMIZABLE_VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm"];
const OPTIMIZABLE_EXTENSIONS = [
  ...OPTIMIZABLE_IMAGE_EXTENSIONS,
  "pdf",
  ...OPTIMIZABLE_VIDEO_EXTENSIONS,
];

export function getCompressionType(
  path: string
): CompressionType | null {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (OPTIMIZABLE_IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (OPTIMIZABLE_VIDEO_EXTENSIONS.includes(ext)) return "video";
  return null;
}

export function canOptimize(path: string, isDirectory: boolean): boolean {
  if (isDirectory) return false;
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return OPTIMIZABLE_EXTENSIONS.includes(ext);
}

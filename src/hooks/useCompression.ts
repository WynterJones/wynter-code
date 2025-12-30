import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CompressionResult, ImageEstimateResult } from "@/types/compression";
import { getCompressionType } from "@/types/compression";

export function useCompression() {
  const { compressionArchiveOverwrite, compressionMediaOverwrite } =
    useSettingsStore();

  const createArchive = async (paths: string[]): Promise<CompressionResult> => {
    return invoke<CompressionResult>("create_zip_archive", {
      paths,
      outputPath: null,
      overwrite: compressionArchiveOverwrite,
    });
  };

  const estimateImageOptimization = async (
    path: string,
    quality: number = 85,
    convertToWebp: boolean = false
  ): Promise<ImageEstimateResult> => {
    return invoke<ImageEstimateResult>("estimate_image_optimization", {
      path,
      quality,
      convertToWebp,
    });
  };

  const optimizeImage = async (
    path: string,
    options?: { overwrite?: boolean; quality?: number; convertToWebp?: boolean }
  ): Promise<CompressionResult> => {
    return invoke<CompressionResult>("optimize_image", {
      path,
      overwrite: options?.overwrite ?? compressionMediaOverwrite,
      quality: options?.quality ?? null,
      convertToWebp: options?.convertToWebp ?? false,
    });
  };

  const optimizePdf = async (path: string): Promise<CompressionResult> => {
    return invoke<CompressionResult>("optimize_pdf", {
      path,
      overwrite: compressionMediaOverwrite,
    });
  };

  const optimizeVideo = async (path: string): Promise<CompressionResult> => {
    return invoke<CompressionResult>("optimize_video", {
      path,
      overwrite: compressionMediaOverwrite,
    });
  };

  const checkFfmpegAvailable = async (): Promise<boolean> => {
    return invoke<boolean>("check_ffmpeg_available");
  };

  const optimizeFile = async (path: string): Promise<CompressionResult> => {
    const type = getCompressionType(path);
    switch (type) {
      case "image":
        return optimizeImage(path);
      case "pdf":
        return optimizePdf(path);
      case "video":
        return optimizeVideo(path);
      default:
        throw new Error(`Cannot optimize file type: ${path}`);
    }
  };

  return {
    createArchive,
    estimateImageOptimization,
    optimizeImage,
    optimizePdf,
    optimizeVideo,
    optimizeFile,
    checkFfmpegAvailable,
    getCompressionType,
  };
}

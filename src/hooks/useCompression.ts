import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CompressionResult } from "@/types/compression";
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

  const optimizeImage = async (path: string): Promise<CompressionResult> => {
    return invoke<CompressionResult>("optimize_image", {
      path,
      overwrite: compressionMediaOverwrite,
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
    optimizeImage,
    optimizePdf,
    optimizeVideo,
    optimizeFile,
    checkFfmpegAvailable,
    getCompressionType,
  };
}

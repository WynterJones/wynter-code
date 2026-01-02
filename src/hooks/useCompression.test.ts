import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useCompression } from "./useCompression";
import { getCompressionType } from "@/types/compression";
import type { CompressionResult, ImageEstimateResult } from "@/types/compression";

// Mock the settings store
vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: vi.fn(() => ({
    compressionArchiveOverwrite: false,
    compressionMediaOverwrite: true,
  })),
}));

describe("useCompression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createArchive", () => {
    it("should call invoke with correct parameters", async () => {
      const mockResult: CompressionResult = {
        success: true,
        outputPath: "/path/to/output.zip",
        originalSize: 1000,
        compressedSize: 500,
        savingsPercent: 50,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompression());

      let archiveResult: CompressionResult | undefined;
      await act(async () => {
        archiveResult = await result.current.createArchive(["/path/to/file1", "/path/to/file2"]);
      });

      expect(invoke).toHaveBeenCalledWith("create_zip_archive", {
        paths: ["/path/to/file1", "/path/to/file2"],
        outputPath: null,
        overwrite: false, // From mocked settings
      });
      expect(archiveResult).toEqual(mockResult);
    });
  });

  describe("estimateImageOptimization", () => {
    it("should call invoke with default parameters", async () => {
      const mockResult: ImageEstimateResult = {
        originalSize: 1000,
        estimatedSize: 700,
        estimatedSavingsPercent: 30,
        format: "png",
        targetFormat: "png",
        supportsQuality: true,
        canConvertToWebp: true,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompression());

      let estimateResult: ImageEstimateResult | undefined;
      await act(async () => {
        estimateResult = await result.current.estimateImageOptimization("/path/to/image.png");
      });

      expect(invoke).toHaveBeenCalledWith("estimate_image_optimization", {
        path: "/path/to/image.png",
        quality: 85,
        convertToWebp: false,
      });
      expect(estimateResult).toEqual(mockResult);
    });

    it("should call invoke with custom parameters", async () => {
      vi.mocked(invoke).mockResolvedValue({} as ImageEstimateResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.estimateImageOptimization("/path/to/image.png", 75, true);
      });

      expect(invoke).toHaveBeenCalledWith("estimate_image_optimization", {
        path: "/path/to/image.png",
        quality: 75,
        convertToWebp: true,
      });
    });
  });

  describe("optimizeImage", () => {
    it("should use settings store defaults when no options provided", async () => {
      const mockResult: CompressionResult = {
        success: true,
        outputPath: "/path/to/optimized.png",
        originalSize: 1000,
        compressedSize: 600,
        savingsPercent: 40,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.optimizeImage("/path/to/image.png");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_image", {
        path: "/path/to/image.png",
        overwrite: true, // From mocked settings
        quality: null,
        convertToWebp: false,
      });
    });

    it("should use provided options over settings defaults", async () => {
      vi.mocked(invoke).mockResolvedValue({} as CompressionResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.optimizeImage("/path/to/image.png", {
          overwrite: false,
          quality: 90,
          convertToWebp: true,
        });
      });

      expect(invoke).toHaveBeenCalledWith("optimize_image", {
        path: "/path/to/image.png",
        overwrite: false,
        quality: 90,
        convertToWebp: true,
      });
    });
  });

  describe("optimizePdf", () => {
    it("should call invoke with correct parameters", async () => {
      const mockResult: CompressionResult = {
        success: true,
        outputPath: "/path/to/optimized.pdf",
        originalSize: 2000,
        compressedSize: 1200,
        savingsPercent: 40,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompression());

      let pdfResult: CompressionResult | undefined;
      await act(async () => {
        pdfResult = await result.current.optimizePdf("/path/to/document.pdf");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_pdf", {
        path: "/path/to/document.pdf",
        overwrite: true, // From mocked settings
      });
      expect(pdfResult).toEqual(mockResult);
    });
  });

  describe("optimizeVideo", () => {
    it("should call invoke with correct parameters", async () => {
      const mockResult: CompressionResult = {
        success: true,
        outputPath: "/path/to/optimized.mp4",
        originalSize: 100000,
        compressedSize: 50000,
        savingsPercent: 50,
      };
      vi.mocked(invoke).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useCompression());

      let videoResult: CompressionResult | undefined;
      await act(async () => {
        videoResult = await result.current.optimizeVideo("/path/to/video.mp4");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_video", {
        path: "/path/to/video.mp4",
        overwrite: true, // From mocked settings
      });
      expect(videoResult).toEqual(mockResult);
    });
  });

  describe("checkFfmpegAvailable", () => {
    it("should return true when ffmpeg is available", async () => {
      vi.mocked(invoke).mockResolvedValue(true);

      const { result } = renderHook(() => useCompression());

      let isAvailable: boolean | undefined;
      await act(async () => {
        isAvailable = await result.current.checkFfmpegAvailable();
      });

      expect(invoke).toHaveBeenCalledWith("check_ffmpeg_available");
      expect(isAvailable).toBe(true);
    });

    it("should return false when ffmpeg is not available", async () => {
      vi.mocked(invoke).mockResolvedValue(false);

      const { result } = renderHook(() => useCompression());

      let isAvailable: boolean | undefined;
      await act(async () => {
        isAvailable = await result.current.checkFfmpegAvailable();
      });

      expect(isAvailable).toBe(false);
    });
  });

  describe("optimizeFile", () => {
    it("should route image files to optimizeImage", async () => {
      vi.mocked(invoke).mockResolvedValue({} as CompressionResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.optimizeFile("/path/to/image.png");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_image", expect.any(Object));
    });

    it("should route PDF files to optimizePdf", async () => {
      vi.mocked(invoke).mockResolvedValue({} as CompressionResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.optimizeFile("/path/to/document.pdf");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_pdf", expect.any(Object));
    });

    it("should route video files to optimizeVideo", async () => {
      vi.mocked(invoke).mockResolvedValue({} as CompressionResult);

      const { result } = renderHook(() => useCompression());

      await act(async () => {
        await result.current.optimizeFile("/path/to/video.mp4");
      });

      expect(invoke).toHaveBeenCalledWith("optimize_video", expect.any(Object));
    });

    it("should throw error for unsupported file types", async () => {
      const { result } = renderHook(() => useCompression());

      await expect(
        act(async () => {
          await result.current.optimizeFile("/path/to/file.txt");
        })
      ).rejects.toThrow("Cannot optimize file type: /path/to/file.txt");
    });
  });

  describe("getCompressionType (re-exported)", () => {
    it("should be exposed from the hook", () => {
      const { result } = renderHook(() => useCompression());
      expect(result.current.getCompressionType).toBe(getCompressionType);
    });
  });
});

// Test the getCompressionType utility directly
describe("getCompressionType", () => {
  it("should return 'image' for image extensions", () => {
    expect(getCompressionType("/path/to/file.png")).toBe("image");
    expect(getCompressionType("/path/to/file.jpg")).toBe("image");
    expect(getCompressionType("/path/to/file.jpeg")).toBe("image");
    expect(getCompressionType("/path/to/file.gif")).toBe("image");
    expect(getCompressionType("/path/to/file.webp")).toBe("image");
  });

  it("should return 'pdf' for PDF files", () => {
    expect(getCompressionType("/path/to/file.pdf")).toBe("pdf");
    expect(getCompressionType("/path/to/file.PDF")).toBe("pdf");
  });

  it("should return 'video' for video extensions", () => {
    expect(getCompressionType("/path/to/file.mp4")).toBe("video");
    expect(getCompressionType("/path/to/file.mov")).toBe("video");
    expect(getCompressionType("/path/to/file.avi")).toBe("video");
    expect(getCompressionType("/path/to/file.mkv")).toBe("video");
    expect(getCompressionType("/path/to/file.webm")).toBe("video");
  });

  it("should return null for unsupported extensions", () => {
    expect(getCompressionType("/path/to/file.txt")).toBe(null);
    expect(getCompressionType("/path/to/file.doc")).toBe(null);
    expect(getCompressionType("/path/to/file.zip")).toBe(null);
    expect(getCompressionType("/path/to/file")).toBe(null);
  });

  it("should be case-insensitive", () => {
    expect(getCompressionType("/path/to/file.PNG")).toBe("image");
    expect(getCompressionType("/path/to/file.MP4")).toBe("video");
  });
});

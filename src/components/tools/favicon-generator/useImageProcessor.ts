import { useState, useCallback } from "react";
import { encodeIco, type IcoImage } from "./icoEncoder";

export interface ProcessedFavicons {
  ico: Blob;
  favicon16: Blob;
  favicon32: Blob;
  appleTouchIcon: Blob;
  androidChrome192: Blob;
  androidChrome512: Blob;
  mstile150: Blob;
}

interface FaviconSize {
  key: keyof Omit<ProcessedFavicons, "ico">;
  size: number;
}

const FAVICON_SIZES: FaviconSize[] = [
  { key: "favicon16", size: 16 },
  { key: "favicon32", size: 32 },
  { key: "appleTouchIcon", size: 180 },
  { key: "androidChrome192", size: 192 },
  { key: "androidChrome512", size: 512 },
  { key: "mstile150", size: 150 },
];

const ICO_SIZES = [16, 32, 48];

/**
 * Load an image file into an HTMLImageElement
 */
async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));

    const url = URL.createObjectURL(file);
    img.src = url;

    // For SVG, we need to set dimensions if not specified
    if (file.type === "image/svg+xml") {
      img.width = 512;
      img.height = 512;
    }
  });
}

/**
 * Resize an image to a square target size using canvas.
 * Non-square images are center-cropped.
 */
async function resizeImage(
  source: HTMLImageElement,
  targetSize: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = targetSize;
  canvas.height = targetSize;

  // Center-crop to square if needed
  const sourceSize = Math.min(source.naturalWidth, source.naturalHeight);
  const sx = (source.naturalWidth - sourceSize) / 2;
  const sy = (source.naturalHeight - sourceSize) / 2;

  // Enable high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw resized image
  ctx.drawImage(
    source,
    sx,
    sy,
    sourceSize,
    sourceSize,
    0,
    0,
    targetSize,
    targetSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/png",
      1.0
    );
  });
}

/**
 * Convert a Blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}

/**
 * Hook for processing images into favicon set
 */
export function useImageProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(
    async (file: File): Promise<ProcessedFavicons> => {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      try {
        // Load the source image
        const sourceImage = await loadImage(file);
        setProgress(10);

        // Generate all PNG sizes
        const results: Partial<ProcessedFavicons> = {};
        const totalSteps = FAVICON_SIZES.length + 1; // +1 for ICO

        for (let i = 0; i < FAVICON_SIZES.length; i++) {
          const { key, size } = FAVICON_SIZES[i];
          results[key] = await resizeImage(sourceImage, size);
          setProgress(10 + ((i + 1) / totalSteps) * 80);
        }

        // Generate ICO with multiple sizes
        const icoImages: IcoImage[] = [];
        for (const size of ICO_SIZES) {
          const blob = await resizeImage(sourceImage, size);
          const data = await blobToArrayBuffer(blob);
          icoImages.push({ width: size, height: size, data });
        }
        results.ico = encodeIco(icoImages);
        setProgress(100);

        // Revoke the object URL to free memory
        URL.revokeObjectURL(sourceImage.src);

        return results as ProcessedFavicons;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to process image";
        setError(message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    process,
    isProcessing,
    progress,
    error,
  };
}

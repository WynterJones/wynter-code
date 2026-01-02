import { useState, useRef } from "react";
import { Download, Trash2, Image as ImageIcon, FileDown, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/storageUtils";
import JSZip from "jszip";

interface ProcessedImage {
  id: string;
  file: File;
  originalSize: number;
  cleanedSize: number;
  url: string;
  cleanedUrl: string;
  name: string;
}

function stripExif(file: File): Promise<{ blob: Blob; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, size: blob.size });
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          file.type || "image/png",
          0.95
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ExifDataRemover() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setProcessing(true);

    const processed: ProcessedImage[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      try {
        const originalUrl = URL.createObjectURL(file);
        const { blob, size: cleanedSize } = await stripExif(file);
        const cleanedUrl = URL.createObjectURL(blob);

        processed.push({
          id: Math.random().toString(36).substring(7),
          file,
          originalSize: file.size,
          cleanedSize,
          url: originalUrl,
          cleanedUrl,
          name: file.name,
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }
    }

    setImages((prev) => [...prev, ...processed]);
    setProcessing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (image: ProcessedImage) => {
    const link = document.createElement("a");
    link.href = image.cleanedUrl;
    link.download = image.name.replace(/\.[^/.]+$/, "") + "_cleaned" + image.name.substring(image.name.lastIndexOf("."));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    const zip = new JSZip();
    const promises = images.map(async (image) => {
      const response = await fetch(image.cleanedUrl);
      const blob = await response.blob();
      const fileName = image.name.replace(/\.[^/.]+$/, "") + "_cleaned" + image.name.substring(image.name.lastIndexOf("."));
      zip.file(fileName, blob);
    });

    await Promise.all(promises);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "cleaned_images.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleRemove = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.url);
        URL.revokeObjectURL(image.cleanedUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleClear = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.url);
      URL.revokeObjectURL(image.cleanedUrl);
    });
    setImages([]);
  };

  const totalOriginalSize = images.reduce((sum, img) => sum + img.originalSize, 0);
  const totalCleanedSize = images.reduce((sum, img) => sum + img.cleanedSize, 0);
  const totalSaved = totalOriginalSize - totalCleanedSize;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">Upload Images</label>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <>
              {images.length > 1 && (
                <Tooltip content="Download All as ZIP">
                  <IconButton size="sm" onClick={handleDownloadAll} aria-label="Download all images as ZIP">
                    <FileDown className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip content="Clear All">
                <IconButton size="sm" onClick={handleClear} aria-label="Clear all images">
                  <Trash2 className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3",
          "border-border bg-bg-secondary hover:border-accent/50 transition-colors cursor-pointer",
          processing && "opacity-50 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <ImageIcon className="w-12 h-12 text-text-tertiary" />
        <div className="text-center">
          <div className="text-sm font-medium text-text-primary">
            {processing ? "Processing..." : "Click to upload images"}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            Drag and drop or click to select multiple images
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-bg-secondary rounded-lg text-sm">
          <div className="text-text-secondary">
            {images.length} {images.length === 1 ? "image" : "images"} processed
          </div>
          {totalSaved > 0 && (
            <div className="text-green-400">
              {formatBytes(totalSaved)} saved
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-auto">
        {images.map((image) => {
          const saved = image.originalSize - image.cleanedSize;
          const savedPercent = ((saved / image.originalSize) * 100).toFixed(1);

          return (
            <div
              key={image.id}
              className="flex flex-col gap-3 p-4 bg-bg-secondary rounded-lg border border-border"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{image.name}</div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-tertiary">
                    <span>Original: {formatBytes(image.originalSize)}</span>
                    <span>Cleaned: {formatBytes(image.cleanedSize)}</span>
                    {saved > 0 && (
                      <span className="text-green-400">
                        Saved: {formatBytes(saved)} ({savedPercent}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip content="Download Cleaned">
                    <IconButton size="sm" onClick={() => handleDownload(image)} aria-label="Download cleaned image">
                      <Download className="w-3.5 h-3.5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Remove">
                    <IconButton size="sm" onClick={() => handleRemove(image.id)} aria-label="Remove image from list">
                      <X className="w-3.5 h-3.5" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-text-tertiary">Original</div>
                  <div className="relative w-full aspect-square bg-bg-primary rounded border border-border overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-text-tertiary">Cleaned (No EXIF)</div>
                  <div className="relative w-full aspect-square bg-bg-primary rounded border border-border overflow-hidden">
                    <img
                      src={image.cleanedUrl}
                      alt={image.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs text-text-tertiary p-2 bg-bg-primary rounded">
                <strong>Metadata removed:</strong> GPS location, camera settings, date/time, software info, and other EXIF data. Image quality preserved.
              </div>
            </div>
          );
        })}
      </div>

      {images.length === 0 && !processing && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Upload images to remove EXIF metadata
        </div>
      )}
    </div>
  );
}


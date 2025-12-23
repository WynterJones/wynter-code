import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onImageSelected: (file: File) => void;
  currentImage: File | null;
  onClear: () => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export function DropZone({
  onImageSelected,
  currentImage,
  onClear,
  disabled = false,
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return;
      }

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });

      onImageSelected(file);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onClear();
    },
    [previewUrl, onClear]
  );

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-full h-48 rounded-lg border-2 border-dashed",
        "transition-colors cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        isDragOver
          ? "border-blue-500 bg-blue-500/10"
          : currentImage
            ? "border-green-500/50 bg-green-500/5"
            : "border-neutral-600 hover:border-neutral-500 bg-neutral-800/30"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {currentImage && previewUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#2a2a2a_0%_50%)] bg-[length:16px_16px]">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-neutral-200 font-medium">
              {currentImage.name}
            </span>
            <span className="text-xs text-neutral-400">
              {(currentImage.size / 1024).toFixed(1)} KB
            </span>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-1"
            >
              <X className="w-3 h-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-3",
              isDragOver ? "bg-blue-500/20" : "bg-neutral-700/50"
            )}
          >
            {isDragOver ? (
              <Upload className="w-6 h-6 text-blue-400" />
            ) : (
              <ImageIcon className="w-6 h-6 text-neutral-400" />
            )}
          </div>
          <p className="text-sm text-neutral-300 mb-1">
            {isDragOver ? "Drop image here" : "Drop an image or click to select"}
          </p>
          <p className="text-xs text-neutral-500">PNG, JPG, SVG, or WebP</p>
        </>
      )}
    </div>
  );
}

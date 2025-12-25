import { useState, useCallback, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading: boolean;
  progress: number;
  message: string;
  disabled?: boolean;
}

export function DropZone({
  onFileDrop,
  isUploading,
  progress,
  message,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith(".zip") || file.type === "application/zip") {
          onFileDrop(file);
        }
      }
    },
    [disabled, isUploading, onFileDrop]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileDrop(file);
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFileDrop]
  );

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 transition-colors",
        "flex flex-col items-center justify-center text-center min-h-[140px]",
        isDragging
          ? "border-accent bg-accent/5"
          : "border-border hover:border-text-secondary",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && !isUploading && "cursor-pointer"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 w-full">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />

          {/* Progress bar */}
          <div className="w-full max-w-[200px] h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-sm text-text-secondary font-mono">{message}</div>
        </div>
      ) : (
        <>
          <Upload
            className={cn(
              "w-8 h-8 mb-2",
              isDragging ? "text-accent" : "text-text-secondary"
            )}
          />
          <div className="text-sm text-text-primary mb-1">
            {isDragging ? "Release to deploy!" : "Drop ZIP file here"}
          </div>
          <div className="text-xs text-text-secondary">or click to browse</div>
        </>
      )}
    </div>
  );
}

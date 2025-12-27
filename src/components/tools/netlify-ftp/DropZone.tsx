import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2 } from "lucide-react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading: boolean;
  progress: number;
  message: string;
  disabled?: boolean;
}

function isZipFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".zip");
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
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check if a position is within the dropzone bounds
  const isPositionInDropZone = useCallback((x: number, y: number): boolean => {
    if (!dropZoneRef.current) return false;
    const rect = dropZoneRef.current.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  // Listen for Tauri file drop events (works with Finder/external apps)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent(async (event) => {
          if (disabled || isUploading) return;

          const eventType = event.payload.type;

          if (eventType === "enter" || eventType === "over") {
            // Check if position is over our dropzone
            const pos = event.payload.position;
            if (pos && isPositionInDropZone(pos.x, pos.y)) {
              setIsDragging(true);
            } else {
              setIsDragging(false);
            }
          } else if (eventType === "drop") {
            setIsDragging(false);

            // Check if drop position is within our dropzone
            const pos = event.payload.position;
            if (!pos || !isPositionInDropZone(pos.x, pos.y)) return;

            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const filePath = paths[0];
              const fileName = filePath.split("/").pop() || filePath;

              if (isZipFile(fileName)) {
                try {
                  // Read the file as binary using Tauri command
                  const base64Data = await invoke<string>("read_file_base64", {
                    path: filePath,
                  });
                  // Convert base64 to binary
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  // Create a File object from the data
                  const file = new File([bytes], fileName, {
                    type: "application/zip",
                  });
                  onFileDrop(file);
                } catch (err) {
                  console.error("Failed to read dropped file:", err);
                }
              }
            }
          } else if (eventType === "leave") {
            setIsDragging(false);
          }
        });
      } catch (err) {
        console.error("Failed to setup drag-drop listener:", err);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [disabled, isUploading, onFileDrop, isPositionInDropZone]);

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

  // HTML5 drop handler as fallback (for internal drags)
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (isZipFile(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
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
      ref={dropZoneRef}
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

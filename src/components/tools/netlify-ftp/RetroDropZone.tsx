import { useState, useCallback, useRef } from "react";
import { Folder, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import "./netlify-ftp.css";

interface RetroDropZoneProps {
  onFileDrop: (file: File) => void;
  isUploading: boolean;
  progress: number;
  message: string;
  disabled?: boolean;
  theme?: "classic" | "terminal" | "amber";
}

const ASCII_UPLOAD = `
╔════════════════════════════╗
║                            ║
║     📦 DROP ZIP HERE       ║
║                            ║
║        ↓  ↓  ↓             ║
║                            ║
╚════════════════════════════╝
`;

const ASCII_UPLOADING = `
╔════════════════════════════╗
║                            ║
║     ⚡ TRANSFERRING...     ║
║                            ║
║   [==================>]    ║
║                            ║
╚════════════════════════════╝
`;

export function RetroDropZone({
  onFileDrop,
  isUploading,
  progress,
  message,
  disabled = false,
  theme = "classic",
}: RetroDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, [disabled, isUploading, onFileDrop]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileDrop(file);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFileDrop]);

  const isTerminalTheme = theme === "terminal" || theme === "amber";

  return (
    <div
      className={cn(
        "retro-dropzone",
        isDragging && "dragging",
        isTerminalTheme && "crt-scanlines",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{ cursor: disabled || isUploading ? "not-allowed" : "pointer" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {isUploading ? (
        <div className="flex flex-col items-center gap-4 w-full">
          <pre className={cn("ascii-box text-center", isTerminalTheme && "crt-glow")}>
            {ASCII_UPLOADING}
          </pre>
          
          <div className="w-full max-w-[200px]">
            <div className="retro-progress">
              <div 
                className="retro-progress-bar animated"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <div className={cn(
            "text-xs font-mono",
            isTerminalTheme && "crt-glow"
          )}>
            {message}
            <span className="blink">_</span>
          </div>
        </div>
      ) : (
        <>
          <pre className={cn("ascii-box text-center", isTerminalTheme && "crt-glow")}>
            {ASCII_UPLOAD}
          </pre>
          
          <div className={cn(
            "flex items-center gap-2 text-xs mt-2",
            isTerminalTheme ? "crt-glow" : "text-gray-600"
          )}>
            {isDragging ? (
              <>
                <Upload className="w-4 h-4 animate-bounce" />
                <span>Release to deploy!</span>
              </>
            ) : (
              <>
                <Folder className="w-4 h-4" />
                <span>Drag .zip file here or click to browse</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

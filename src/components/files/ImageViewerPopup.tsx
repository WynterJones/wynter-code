import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";

interface ImageViewerPopupProps {
  filePath: string;
  onClose: () => void;
}

export function ImageViewerPopup({ filePath, onClose }: ImageViewerPopupProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const imageSrc = convertFileSrc(filePath);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.1, 5));
    } else {
      setZoom((z) => Math.max(z - 0.1, 0.25));
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
    if (e.key === "+" || e.key === "=") {
      handleZoomIn();
    }
    if (e.key === "-") {
      handleZoomOut();
    }
    if (e.key === "r" || e.key === "R") {
      handleRotate();
    }
    if (e.key === "0") {
      handleReset();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm">
      <div className="w-full h-full max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Drags the window */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <span className="font-mono text-sm text-text-primary">{fileName}</span>
          <div className="flex items-center gap-1">
            <Tooltip content="Zoom Out (-)" side="bottom">
              <IconButton size="sm" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <span className="px-2 text-xs text-text-secondary min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Tooltip content="Zoom In (+)" side="bottom">
              <IconButton size="sm" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <div className="w-px h-4 bg-border mx-2" />
            <Tooltip content="Rotate (R)" side="bottom">
              <IconButton size="sm" onClick={handleRotate}>
                <RotateCw className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Reset (0)" side="bottom">
              <IconButton size="sm" onClick={handleReset}>
                <Maximize2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <div className="w-px h-4 bg-border mx-2" />
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Image Container */}
        <div
          className={cn(
            "flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0f]",
            zoom > 1 && "cursor-grab",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel as unknown as React.WheelEventHandler}
        >
          {error ? (
            <div className="text-accent-red">{error}</div>
          ) : (
            <img
              src={imageSrc}
              alt={fileName}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-200",
                !imageLoaded && "opacity-0"
              )}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setError("Failed to load image")}
              draggable={false}
            />
          )}
          {!imageLoaded && !error && (
            <div className="absolute text-text-secondary">Loading...</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <span className="font-mono truncate">{filePath}</span>
          <div className="flex items-center gap-4">
            <span>Rotation: {rotation}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}

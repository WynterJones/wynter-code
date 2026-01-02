import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { IconButton, Tooltip } from "@/components/ui";

interface PdfViewerPopupProps {
  filePath: string;
  onClose: () => void;
}

export function PdfViewerPopup({ filePath, onClose }: PdfViewerPopupProps) {
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const pdfSrc = convertFileSrc(filePath);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleResetZoom = () => setZoom(100);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "+" || e.key === "=") handleZoomIn();
    if (e.key === "-") handleZoomOut();
    if (e.key === "0") handleResetZoom();
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
              <IconButton size="sm" onClick={handleZoomOut} aria-label="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <span className="px-2 text-xs text-text-secondary min-w-[60px] text-center">
              {zoom}%
            </span>
            <Tooltip content="Zoom In (+)" side="bottom">
              <IconButton size="sm" onClick={handleZoomIn} aria-label="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip content="Reset (0)" side="bottom">
              <IconButton size="sm" onClick={handleResetZoom} aria-label="Reset zoom level">
                <Maximize2 className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <div className="w-px h-4 bg-border mx-2" />
            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose} aria-label="Close PDF viewer">
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* PDF Container */}
        <div className="flex-1 overflow-auto bg-[#525659]">
          {error ? (
            <div className="flex items-center justify-center h-full text-accent-red">
              {error}
            </div>
          ) : (
            <div
              className="min-h-full flex justify-center p-4"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            >
              <embed
                src={pdfSrc}
                type="application/pdf"
                className="w-full h-full min-h-[calc(100vh-200px)]"
                style={{ minWidth: "800px" }}
                onError={() => setError("Failed to load PDF")}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-secondary text-xs text-text-secondary">
          <span className="font-mono truncate">{filePath}</span>
          <span>Use scroll to navigate pages</span>
        </div>
      </div>
    </div>
  );
}

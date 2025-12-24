import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useGifRecording } from "./hooks/useGifRecording";
import type { RegionSelection, GifRecordingSettings } from "./types";
import { DEFAULT_GIF_SETTINGS } from "./types";
import { Play, Square, Download, X } from "lucide-react";

export function GifRegionSelectorWindow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [regionStart, setRegionStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [region, setRegion] = useState<RegionSelection>({
    x: window.screen.width * 0.1,
    y: window.screen.height * 0.1,
    width: window.screen.width * 0.8,
    height: window.screen.height * 0.8,
  });
  const [settings] = useState<GifRecordingSettings>(DEFAULT_GIF_SETTINGS);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    state,
    currentRecording,
    error,
    startRecording,
    stopRecording,
    exportGif,
  } = useGifRecording();

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isRecording) {
          stopRecording();
        } else {
          await invoke("close_gif_region_selector_window");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, stopRecording]);

  useEffect(() => {
    if (state === "recording") {
      setIsRecording(true);
    } else if (state === "completed") {
      setIsRecording(false);
    }
  }, [state]);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    if (isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    setRegionStart({ ...region });

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
  }, [region, isRecording]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    if (isDragging) {
      const newX = Math.max(0, Math.min(screenWidth - regionStart.width, regionStart.x + deltaX));
      const newY = Math.max(0, Math.min(screenHeight - regionStart.height, regionStart.y + deltaY));

      const newRegion = {
        x: newX,
        y: newY,
        width: regionStart.width,
        height: regionStart.height,
      };
      setRegion(newRegion);
    } else if (isResizing && resizeHandle) {
      let newRegion = { ...regionStart };

      if (resizeHandle.includes("e")) {
        newRegion.width = Math.max(50, Math.min(screenWidth - regionStart.x, regionStart.width + deltaX));
      }
      if (resizeHandle.includes("w")) {
        const maxDelta = regionStart.x;
        const actualDelta = Math.min(deltaX, maxDelta);
        newRegion.x = regionStart.x + actualDelta;
        newRegion.width = regionStart.width - actualDelta;
      }
      if (resizeHandle.includes("s")) {
        newRegion.height = Math.max(50, Math.min(screenHeight - regionStart.y, regionStart.height + deltaY));
      }
      if (resizeHandle.includes("n")) {
        const maxDelta = regionStart.y;
        const actualDelta = Math.min(deltaY, maxDelta);
        newRegion.y = regionStart.y + actualDelta;
        newRegion.height = regionStart.height - actualDelta;
      }

      setRegion(newRegion);
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, regionStart, screenWidth, screenHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording(region, settings);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [region, settings, startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleSaveGif = useCallback(async () => {
    if (!currentRecording) return;

    try {
      setIsProcessing(true);
      const blob = await exportGif();

      const filePath = await save({
        defaultPath: `recording-${Date.now()}.gif`,
        filters: [
          {
            name: "GIF",
            extensions: ["gif"],
          },
        ],
      });

      if (filePath) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(filePath, uint8Array);
        await invoke("close_gif_region_selector_window");
      }
    } catch (err) {
      console.error("Failed to save GIF:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [currentRecording, exportGif]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{ backgroundColor: "transparent" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-0 right-0 top-0 bg-black/50"
          style={{ height: region.y }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 bg-black/50"
          style={{ height: screenHeight - region.y - region.height }}
        />
        <div
          className="absolute left-0 bg-black/50"
          style={{
            top: region.y,
            width: region.x,
            height: region.height,
          }}
        />
        <div
          className="absolute right-0 bg-black/50"
          style={{
            top: region.y,
            width: screenWidth - region.x - region.width,
            height: region.height,
          }}
        />
      </div>

      <div
        className={`absolute border-2 ${isRecording ? "border-red-500" : "border-accent"} bg-transparent ${isRecording ? "" : "cursor-move"} pointer-events-auto ${
          isDragging || isResizing ? "border-accent/80" : ""
        }`}
        style={{
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        }}
        onMouseDown={(e) => !isRecording && handleMouseDown(e)}
      >
        {!isRecording && (
          <>
            <div
              className="absolute -top-1 -left-1 w-3 h-3 bg-accent border border-accent cursor-nwse-resize"
              onMouseDown={(e) => handleMouseDown(e, "nw")}
            />
            <div
              className="absolute -top-1 -right-1 w-3 h-3 bg-accent border border-accent cursor-nesw-resize"
              onMouseDown={(e) => handleMouseDown(e, "ne")}
            />
            <div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-accent border border-accent cursor-nesw-resize"
              onMouseDown={(e) => handleMouseDown(e, "sw")}
            />
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent border border-accent cursor-nwse-resize"
              onMouseDown={(e) => handleMouseDown(e, "se")}
            />
          </>
        )}

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/80 px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
          {Math.round(region.width)} × {Math.round(region.height)}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-3 items-center">
        {error && (
          <div className="px-3 py-2 bg-red-500/90 text-white rounded-lg text-sm mb-2">
            {error}
          </div>
        )}
        
        {!isRecording && !currentRecording && (
          <button
            onClick={handleStartRecording}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Record
          </button>
        )}

        {isRecording && (
          <button
            onClick={handleStopRecording}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </button>
        )}

        {currentRecording && !isRecording && (
          <button
            onClick={handleSaveGif}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isProcessing ? "Processing..." : "Save GIF"}
          </button>
        )}

        <button
          onClick={() => invoke("close_gif_region_selector_window")}
          className="px-3 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

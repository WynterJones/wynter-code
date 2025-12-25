import { useState, useRef, useCallback, useEffect } from "react";
import type { RegionSelection } from "./types";
import { cn } from "@/lib/utils";

interface RegionSelectorProps {
  value: RegionSelection | null;
  onChange: (region: RegionSelection) => void;
  onConfirm: () => void;
}

export function RegionSelector({
  value,
  onChange,
  onConfirm,
}: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [regionStart, setRegionStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  const region = value || {
    x: screenWidth * 0.1,
    y: screenHeight * 0.1,
    width: screenWidth * 0.8,
    height: screenHeight * 0.8,
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
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
  }, [region]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    if (isDragging) {
      const newX = Math.max(0, Math.min(screenWidth - regionStart.width, regionStart.x + deltaX));
      const newY = Math.max(0, Math.min(screenHeight - regionStart.height, regionStart.y + deltaY));

      onChange({
        x: newX,
        y: newY,
        width: regionStart.width,
        height: regionStart.height,
      });
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

      onChange(newRegion);
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, regionStart, screenWidth, screenHeight, onChange]);

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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
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
        className={cn(
          "absolute border-2 border-accent bg-transparent cursor-move pointer-events-auto",
          (isDragging || isResizing) && "border-accent/80"
        )}
        style={{
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        }}
        onMouseDown={(e) => handleMouseDown(e)}
      >
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

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/80 px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
          {Math.round(region.width)} × {Math.round(region.height)}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-accent text-primary-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          Start Recording
        </button>
      </div>
    </div>
  );
}


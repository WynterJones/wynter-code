import { useState, useRef, useCallback, useEffect } from "react";
import type { RegionSelection } from "./types";
import { cn } from "@/lib/utils";

interface RegionSelectorProps {
  value: RegionSelection | null;
  onChange: (region: RegionSelection) => void;
  containerWidth: number;
  containerHeight: number;
}

export function RegionSelector({
  value,
  onChange,
  containerWidth,
  containerHeight,
}: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [regionStart, setRegionStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Default region if none provided
  const region = value || {
    x: containerWidth * 0.1,
    y: containerHeight * 0.1,
    width: containerWidth * 0.8,
    height: containerHeight * 0.8,
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    if (isDragging) {
      // Move the region
      const newX = Math.max(0, Math.min(containerWidth - regionStart.width, regionStart.x + deltaX));
      const newY = Math.max(0, Math.min(containerHeight - regionStart.height, regionStart.y + deltaY));

      onChange({
        x: newX,
        y: newY,
        width: regionStart.width,
        height: regionStart.height,
      });
    } else if (isResizing && resizeHandle) {
      // Resize the region
      let newRegion = { ...regionStart };

      if (resizeHandle.includes("e")) {
        newRegion.width = Math.max(50, Math.min(containerWidth - regionStart.x, regionStart.width + deltaX));
      }
      if (resizeHandle.includes("w")) {
        const maxDelta = regionStart.x;
        const actualDelta = Math.min(deltaX, maxDelta);
        newRegion.x = regionStart.x + actualDelta;
        newRegion.width = regionStart.width - actualDelta;
      }
      if (resizeHandle.includes("s")) {
        newRegion.height = Math.max(50, Math.min(containerHeight - regionStart.y, regionStart.height + deltaY));
      }
      if (resizeHandle.includes("n")) {
        const maxDelta = regionStart.y;
        const actualDelta = Math.min(deltaY, maxDelta);
        newRegion.y = regionStart.y + actualDelta;
        newRegion.height = regionStart.height - actualDelta;
      }

      onChange(newRegion);
    }
  }, [isDragging, isResizing, resizeHandle, dragStart, regionStart, containerWidth, containerHeight, onChange]);

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
      className="region-selector absolute inset-0"
    >
      {/* Dimmed overlay outside selection */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top */}
        <div
          className="absolute left-0 right-0 top-0 bg-black/50"
          style={{ height: region.y }}
        />
        {/* Bottom */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-black/50"
          style={{ height: containerHeight - region.y - region.height }}
        />
        {/* Left */}
        <div
          className="absolute left-0 bg-black/50"
          style={{
            top: region.y,
            width: region.x,
            height: region.height,
          }}
        />
        {/* Right */}
        <div
          className="absolute right-0 bg-black/50"
          style={{
            top: region.y,
            width: containerWidth - region.x - region.width,
            height: region.height,
          }}
        />
      </div>

      {/* Selection Box */}
      <div
        className={cn(
          "region-selection cursor-move",
          (isDragging || isResizing) && "active"
        )}
        style={{
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        }}
        onMouseDown={(e) => handleMouseDown(e)}
      >
        {/* Resize Handles */}
        <div
          className="region-handle nw"
          onMouseDown={(e) => handleMouseDown(e, "nw")}
        />
        <div
          className="region-handle ne"
          onMouseDown={(e) => handleMouseDown(e, "ne")}
        />
        <div
          className="region-handle sw"
          onMouseDown={(e) => handleMouseDown(e, "sw")}
        />
        <div
          className="region-handle se"
          onMouseDown={(e) => handleMouseDown(e, "se")}
        />

        {/* Dimension Display */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/80 px-2 py-0.5 rounded whitespace-nowrap">
          {Math.round(region.width)} × {Math.round(region.height)}
        </div>
      </div>
    </div>
  );
}

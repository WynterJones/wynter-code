import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { TycoonGame } from "./game/TycoonGame";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  X,
  Maximize2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniGamePlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onExpand: () => void;
}

const MIN_SIZE = 200;
const MAX_SIZE = 600;
const DEFAULT_SIZE = 300;

interface Position {
  x: number;
  y: number;
}

export function MiniGamePlayer({ isOpen, onClose, onExpand }: MiniGamePlayerProps) {
  const { refreshStats, isInitialized } = useFarmworkTycoonStore();

  // Poll for stats updates every 5 seconds while mini player is open
  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    const pollInterval = setInterval(() => {
      refreshStats();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isOpen, isInitialized, refreshStats]);

  const [position, setPosition] = useState<Position>(() => ({
    x: window.innerWidth - DEFAULT_SIZE - 20,
    y: window.innerHeight - DEFAULT_SIZE - 80,
  }));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: DEFAULT_SIZE });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      size: size,
    };
  }, [size]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        // Constrain to viewport boundaries with a small margin
        const margin = 10;
        const newX = Math.max(margin, Math.min(window.innerWidth - size - margin, dragStartRef.current.posX + dx));
        const newY = Math.max(margin, Math.min(window.innerHeight - size - margin, dragStartRef.current.posY + dy));

        setPosition({ x: newX, y: newY });
      }

      if (isResizing) {
        const dx = resizeStartRef.current.x - e.clientX;
        const dy = resizeStartRef.current.y - e.clientY;
        const delta = Math.max(dx, dy);

        const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, resizeStartRef.current.size + delta));

        // Calculate new position with boundary constraints
        const margin = 10;
        const sizeDiff = newSize - resizeStartRef.current.size;
        const newX = Math.max(margin, Math.min(window.innerWidth - newSize - margin, dragStartRef.current.posX - sizeDiff));
        const newY = Math.max(margin, Math.min(window.innerHeight - newSize - margin, dragStartRef.current.posY - sizeDiff));

        setSize(newSize);
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, size]);

  useEffect(() => {
    if (isResizing) {
      dragStartRef.current.posX = position.x;
      dragStartRef.current.posY = position.y;
    }
  }, [isResizing, position]);

  // Handle window resize to keep player within bounds
  useEffect(() => {
    const handleResize = () => {
      const margin = 10;
      setPosition((prev) => ({
        x: Math.max(margin, Math.min(window.innerWidth - size - margin, prev.x)),
        y: Math.max(margin, Math.min(window.innerHeight - size - margin, prev.y)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [size]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-[9999] overflow-hidden",
        "transition-shadow duration-200",
        (isDragging || isResizing) && "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size,
        borderRadius: "12px",
        border: "3px solid #3a3a3a",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, #252525 0%, #1a1a1a 30%, #0d0d0d 100%)",
      }}
    >
      {/* Header - Drag Handle */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1.5 cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        style={{
          background: "linear-gradient(180deg, #333 0%, #222 100%)",
          borderBottom: "1px solid #444",
        }}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3" style={{ color: "#666" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{
              color: "#555",
              textShadow: "0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.05)",
            }}
          >
            Farmwork Tycoon
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip content="Expand">
            <IconButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExpand();
              }}
              className="!p-1"
            >
              <Maximize2 className="w-3 h-3" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Close">
            <IconButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="!p-1"
            >
              <X className="w-3 h-3" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Arcade Cabinet Frame */}
      <div
        className="relative"
        style={{
          height: size - 36,
          padding: "8px",
          background: "linear-gradient(180deg, #252525 0%, #1a1a1a 30%, #0d0d0d 100%)",
        }}
      >
        {/* Screen bezel */}
        <div
          className="relative h-full overflow-hidden"
          style={{
            padding: "4px",
            background: "#0a0a0a",
            borderRadius: "4px",
            border: "2px solid #222",
          }}
        >
          {/* CRT Screen glow effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(100,255,100,0.03) 0%, transparent 70%)",
              zIndex: 1,
            }}
          />

          {/* Game canvas */}
          <div className="relative h-full flex items-center justify-center">
            <TycoonGame
              containerWidth={size - 28}
              containerHeight={size - 60}
              isMiniPlayer
            />

            {/* Scanline overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(0, 0, 0, 0.15) 2px,
                  rgba(0, 0, 0, 0.15) 4px
                )`,
                zIndex: 10,
              }}
            />

            {/* Screen reflection/glare */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                zIndex: 11,
              }}
            />

            {/* Vignette effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.4)",
                zIndex: 12,
              }}
            />
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute top-0 left-0 w-4 h-4 cursor-nw-resize",
          "hover:bg-accent/20 transition-colors"
        )}
        style={{
          background: "linear-gradient(-45deg, transparent 50%, var(--color-border) 50%)",
        }}
        onMouseDown={handleResizeStart}
      />
    </div>
  );

  return createPortal(content, document.body);
}

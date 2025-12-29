import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { TycoonGame } from "./game/TycoonGame";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  X,
  Maximize2,
  Minus,
  Plus,
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
const DEFAULT_SIZE = 306; // Results in 368px container height (306 + 16 chrome + 46 header)

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

  const [position, setPosition] = useState<Position>(() => {
    // Initial position accounts for total container size (game + chrome + header)
    const initTotalChrome = 16; // outerPadding(8)*2
    const initHeaderHeight = 46;
    const initContainerWidth = DEFAULT_SIZE + initTotalChrome;
    const initContainerHeight = initHeaderHeight + DEFAULT_SIZE + initTotalChrome;
    return {
      x: window.innerWidth - initContainerWidth - 20,
      y: window.innerHeight - initContainerHeight - 80,
    };
  });
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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
      const headerHeight = 46;
      const minimizedHeight = 50;
      const totalChrome = 16;

      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        // Constrain to viewport boundaries with a small margin
        const margin = 10;
        const currentWidth = size + totalChrome;
        const currentHeight = isMinimized ? minimizedHeight : headerHeight + size + totalChrome;
        const newX = Math.max(margin, Math.min(window.innerWidth - currentWidth - margin, dragStartRef.current.posX + dx));
        const newY = Math.max(margin, Math.min(window.innerHeight - currentHeight - margin, dragStartRef.current.posY + dy));

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
        const newWidth = newSize + totalChrome;
        const newHeight = headerHeight + newSize + totalChrome;
        const newX = Math.max(margin, Math.min(window.innerWidth - newWidth - margin, dragStartRef.current.posX - sizeDiff));
        const newY = Math.max(margin, Math.min(window.innerHeight - newHeight - margin, dragStartRef.current.posY - sizeDiff));

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
  }, [isDragging, isResizing, size, isMinimized]);

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
      const headerHeight = 46;
      const minimizedHeight = 56;
      const totalChrome = 16;
      const contentSize = size + totalChrome;
      const currentWidth = contentSize;
      const currentHeight = isMinimized ? minimizedHeight : headerHeight + contentSize;
      setPosition((prev) => ({
        x: Math.max(margin, Math.min(window.innerWidth - currentWidth - margin, prev.x)),
        y: Math.max(margin, Math.min(window.innerHeight - currentHeight - margin, prev.y)),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [size, isMinimized]);

  if (!isOpen) return null;

  // Calculate dimensions for equal padding around game area
  const headerHeight = 46;
  const minimizedHeight = 50; // Extra height when minimized
  const outerPadding = 8;
  const totalChrome = outerPadding * 2; // 16px - just outer padding, no bezel

  // `size` represents the game area size for cleaner semantics
  const gameSize = size;
  const contentSize = gameSize + totalChrome; // Square content area with equal padding
  const containerWidth = contentSize;
  const containerHeight = isMinimized ? minimizedHeight : headerHeight + contentSize;

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
        width: containerWidth,
        height: containerHeight,
        borderRadius: "12px",
        border: "3px solid #3a3a3a",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, #252525 0%, #1a1a1a 30%, #0d0d0d 100%)",
        transition: isMinimized ? "height 0.2s ease-out" : undefined,
      }}
    >
      {/* Header - Drag Handle */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-2.5 cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        style={{
          height: headerHeight,
          background: "linear-gradient(180deg, #333 0%, #222 100%)",
          borderBottom: isMinimized ? "none" : "1px solid #444",
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
          <Tooltip content={isMinimized ? "Restore" : "Minimize"}>
            <IconButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="!p-1"
            >
              {isMinimized ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </IconButton>
          </Tooltip>
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

      {/* Game Area - Hidden when minimized */}
      {!isMinimized && (
        <div
          className="relative"
          style={{
            height: contentSize,
            padding: `${outerPadding}px`,
            background: "linear-gradient(180deg, #252525 0%, #1a1a1a 30%, #0d0d0d 100%)",
          }}
        >
          {/* Game canvas */}
          <div className="relative w-full h-full overflow-hidden rounded">
            <TycoonGame
              containerWidth={gameSize}
              containerHeight={gameSize}
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
                  rgba(0, 0, 0, 0.1) 2px,
                  rgba(0, 0, 0, 0.1) 4px
                )`,
                zIndex: 10,
              }}
            />

            {/* Vignette effect */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.3)",
                zIndex: 12,
              }}
            />
          </div>
        </div>
      )}

      {/* Resize Handle - Hidden when minimized */}
      {!isMinimized && (
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
      )}
    </div>
  );

  return createPortal(content, document.body);
}

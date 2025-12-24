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

        const newX = Math.max(0, Math.min(window.innerWidth - size, dragStartRef.current.posX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - size - 40, dragStartRef.current.posY + dy));

        setPosition({ x: newX, y: newY });
      }

      if (isResizing) {
        const dx = resizeStartRef.current.x - e.clientX;
        const dy = resizeStartRef.current.y - e.clientY;
        const delta = Math.max(dx, dy);

        const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, resizeStartRef.current.size + delta));
        setSize(newSize);

        const sizeDiff = newSize - resizeStartRef.current.size;
        setPosition({
          x: Math.max(0, dragStartRef.current.posX - sizeDiff),
          y: Math.max(0, dragStartRef.current.posY - sizeDiff),
        });
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

  if (!isOpen) return null;

  const content = (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-[9999] rounded-lg overflow-hidden shadow-2xl",
        "border border-border bg-bg-secondary",
        "transition-shadow duration-200",
        (isDragging || isResizing) && "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size,
      }}
    >
      {/* Header - Drag Handle */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1.5",
          "bg-bg-tertiary border-b border-border cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="w-3 h-3 text-text-secondary" />
          <span className="text-xs font-medium text-text-primary">Farmwork Tycoon</span>
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

      {/* Game Container */}
      <div
        className="relative bg-neutral-950"
        style={{ height: size - 36 }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <TycoonGame
            containerWidth={size}
            containerHeight={size - 36}
            isMiniPlayer
          />
        </div>

        {/* CRT Effects */}
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
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.3)",
          }}
        />
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

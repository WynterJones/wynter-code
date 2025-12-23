import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SplitDirection } from "@/types/panel";

interface SplitResizerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
}

export function SplitResizer({ direction, onResize, onResizeEnd }: SplitResizerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef<number>(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startPos.current = direction === "horizontal" ? e.clientX : e.clientY;
    },
    [direction]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResizeEnd();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, direction, onResize, onResizeEnd]);

  const isHorizontal = direction === "horizontal";
  const GripIcon = isHorizontal ? GripVertical : GripHorizontal;

  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        "hover:bg-accent/10 transition-colors",
        isResizing && "bg-accent/20",
        isHorizontal ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"
      )}
      onMouseDown={handleMouseDown}
    >
      <GripIcon
        className={cn(
          "text-text-secondary/50",
          isHorizontal ? "w-3 h-6" : "w-6 h-3"
        )}
      />
    </div>
  );
}

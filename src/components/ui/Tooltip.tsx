import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

type Position = "top" | "bottom" | "left" | "right";

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>(side);
  const [alignment, setAlignment] = useState<"center" | "start" | "end">("center");
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    let newPosition: Position = side;
    let newAlignment: "center" | "start" | "end" = "center";

    // Check if preferred position would overflow
    if (side === "top" && containerRect.top - tooltipRect.height - padding < 0) {
      newPosition = "bottom";
    } else if (side === "bottom" && containerRect.bottom + tooltipRect.height + padding > window.innerHeight) {
      newPosition = "top";
    } else if (side === "left" && containerRect.left - tooltipRect.width - padding < 0) {
      newPosition = "right";
    } else if (side === "right" && containerRect.right + tooltipRect.width + padding > window.innerWidth) {
      newPosition = "left";
    }

    // For top/bottom positions, check horizontal overflow
    if (newPosition === "top" || newPosition === "bottom") {
      const tooltipLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
      const tooltipRight = tooltipLeft + tooltipRect.width;

      if (tooltipLeft < padding) {
        newAlignment = "start";
      } else if (tooltipRight > window.innerWidth - padding) {
        newAlignment = "end";
      }
    }

    // For left/right positions, check vertical overflow
    if (newPosition === "left" || newPosition === "right") {
      const tooltipTop = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
      const tooltipBottom = tooltipTop + tooltipRect.height;

      if (tooltipTop < padding) {
        newAlignment = "start";
      } else if (tooltipBottom > window.innerHeight - padding) {
        newAlignment = "end";
      }
    }

    setPosition(newPosition);
    setAlignment(newAlignment);
  }, [side]);

  useEffect(() => {
    if (isVisible) {
      // Small delay to allow tooltip to render before measuring
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  const getPositionClasses = () => {
    const positionClasses: Record<Position, Record<string, string>> = {
      top: {
        center: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        start: "bottom-full left-0 mb-2",
        end: "bottom-full right-0 mb-2",
      },
      bottom: {
        center: "top-full left-1/2 -translate-x-1/2 mt-2",
        start: "top-full left-0 mt-2",
        end: "top-full right-0 mt-2",
      },
      left: {
        center: "right-full top-1/2 -translate-y-1/2 mr-2",
        start: "right-full top-0 mr-2",
        end: "right-full bottom-0 mr-2",
      },
      right: {
        center: "left-full top-1/2 -translate-y-1/2 ml-2",
        start: "left-full top-0 ml-2",
        end: "left-full bottom-0 ml-2",
      },
    };

    return positionClasses[position][alignment];
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-[9999] px-2.5 py-1.5 text-sm font-medium rounded-md shadow-lg",
            "bg-bg-tertiary border border-border text-text-primary",
            "whitespace-nowrap pointer-events-none",
            getPositionClasses(),
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

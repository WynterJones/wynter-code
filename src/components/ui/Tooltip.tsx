import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  wrapperClassName?: string;
}

type Position = "top" | "bottom" | "left" | "right";

export function Tooltip({
  content,
  children,
  side = "top",
  className,
  wrapperClassName,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;
    const gap = 8;

    let newPosition: Position = side;
    let x = 0;
    let y = 0;

    // Check if preferred position would overflow and flip if needed
    if (side === "top" && containerRect.top - tooltipRect.height - gap < padding) {
      newPosition = "bottom";
    } else if (side === "bottom" && containerRect.bottom + tooltipRect.height + gap > window.innerHeight - padding) {
      newPosition = "top";
    } else if (side === "left" && containerRect.left - tooltipRect.width - gap < padding) {
      newPosition = "right";
    } else if (side === "right" && containerRect.right + tooltipRect.width + gap > window.innerWidth - padding) {
      newPosition = "left";
    }

    // Calculate coordinates based on position
    switch (newPosition) {
      case "top":
        x = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
        y = containerRect.top - tooltipRect.height - gap;
        break;
      case "bottom":
        x = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
        y = containerRect.bottom + gap;
        break;
      case "left":
        x = containerRect.left - tooltipRect.width - gap;
        y = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = containerRect.right + gap;
        y = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Clamp to viewport bounds
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipRect.height - padding));

    setCoords({ x, y });
    setIsPositioned(true);
  }, [side]);

  useEffect(() => {
    if (isVisible) {
      // Reset positioned state when visibility changes
      setIsPositioned(false);
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex", wrapperClassName)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y,
              opacity: isPositioned ? 1 : 0,
            }}
            className={cn(
              "tooltip-content z-[99999] px-2.5 py-1.5 text-sm font-medium rounded-md shadow-lg",
              "bg-bg-tertiary border border-border text-text-primary",
              "pointer-events-none max-w-xs",
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}

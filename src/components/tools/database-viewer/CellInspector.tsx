import { useState, useRef, useEffect } from "react";
import { X, Pin, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface CellInspectorProps {
  value: unknown;
  isJson: boolean;
  children: React.ReactNode;
}

export function CellInspector({ value, isJson, children }: CellInspectorProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isVisible = isHovering || isPinned;
  const isNull = value === null || value === undefined;

  // Don't show inspector for null/empty values
  const shouldShowInspector = !isNull && (
    isJson ||
    (typeof value === "string" && value.length > 30) ||
    (typeof value === "number" && String(value).length > 15)
  );

  // Format the display value
  const formattedValue = isJson
    ? JSON.stringify(value, null, 2)
    : String(value);

  // Calculate position to avoid overflow
  useEffect(() => {
    if (isVisible && containerRef.current && popoverRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const popoverHeight = popoverRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - containerRect.bottom;

      if (spaceBelow < popoverHeight + 20 && containerRect.top > popoverHeight + 20) {
        setPosition("top");
      } else {
        setPosition("bottom");
      }
    }
  }, [isVisible]);

  // Handle click outside to close pinned popover
  useEffect(() => {
    if (!isPinned) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPinned(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPinned]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Small delay before showing to prevent flicker on quick mouse movements
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (shouldShowInspector) {
      e.stopPropagation();
      setIsPinned(!isPinned);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(formattedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(false);
    setIsHovering(false);
  };

  if (!shouldShowInspector) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className={cn("cursor-pointer", isPinned && "ring-1 ring-accent rounded")}>
        {children}
      </div>

      {isVisible && (
        <div
          ref={popoverRef}
          className={cn(
            "absolute z-50 shadow-lg border border-border rounded-lg bg-bg-secondary",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            position === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
            "left-0",
            isJson ? "w-80 max-w-[90vw]" : "w-64 max-w-[90vw]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-bg-tertiary rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-secondary">
                {isJson ? "JSON" : "Text"}
              </span>
              {isPinned && (
                <Pin className="w-3 h-3 text-accent" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {isPinned && (
                <button
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <OverlayScrollbarsComponent
            className={cn(
              "os-theme-custom",
              isJson ? "max-h-64" : "max-h-32"
            )}
            options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
          >
            <pre
              className={cn(
                "p-2 text-xs font-mono whitespace-pre-wrap break-words",
                isJson ? "text-text-primary" : "text-text-secondary"
              )}
            >
              {formattedValue}
            </pre>
          </OverlayScrollbarsComponent>

          {/* Footer hint */}
          {!isPinned && (
            <div className="px-2 py-1 border-t border-border text-[10px] text-text-tertiary text-center">
              Click to pin
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
  defaultExpanded?: boolean;
}

export function ThinkingBlock({
  content,
  isStreaming = false,
  defaultExpanded = false,
}: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || isStreaming);
  const wasStreamingRef = useRef(isStreaming);

  // Auto-collapse when streaming ends
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      // Streaming just ended, collapse after a short delay
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Auto-expand when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    }
  }, [isStreaming]);

  // Generate preview (first ~100 chars)
  const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border transition-all duration-300",
        isStreaming
          ? "border-accent/50 shadow-[0_0_8px_rgba(var(--accent-rgb),0.15)]"
          : "border-accent/20"
      )}
    >
      {/* Header */}
      <button
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2",
          "hover:bg-accent/10 transition-colors",
          "text-left",
          isStreaming ? "bg-accent/10" : "bg-accent/5"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand icon */}
        <span className="text-accent">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        {/* Brain icon with pulse animation while streaming */}
        <Brain
          className={cn(
            "w-4 h-4 text-accent",
            isStreaming && "animate-pulse"
          )}
        />

        <span className="text-xs text-accent font-medium">
          {isStreaming ? "Thinking..." : "Thinking"}
        </span>

        {/* Preview when collapsed */}
        {!isExpanded && !isStreaming && (
          <span className="text-xs text-text-secondary truncate flex-1 ml-2 font-mono">
            {preview}
          </span>
        )}

        {/* Character count */}
        <span className="text-[10px] text-text-secondary ml-auto tabular-nums">
          {content.length.toLocaleString()} chars
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className={cn(
            "border-t transition-colors",
            isStreaming ? "border-accent/30 bg-bg-secondary" : "border-accent/10 bg-bg-tertiary"
          )}
        >
          <OverlayScrollbarsComponent
            options={{
              scrollbars: {
                autoHide: "scroll",
                autoHideDelay: 400,
              },
            }}
            className="max-h-64"
          >
            <div className="px-3 py-2">
              <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {content}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3 bg-accent ml-0.5 animate-pulse" />
                )}
              </p>
            </div>
          </OverlayScrollbarsComponent>
        </div>
      )}
    </div>
  );
}

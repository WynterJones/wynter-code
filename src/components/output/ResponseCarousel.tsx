import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { OverlayScrollbarsComponent, type OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { IconButton } from "@/components/ui";
import { ClaudeResponseCard } from "./ClaudeResponseCard";
import { cn } from "@/lib/utils";
import type { Message, ToolCall, StreamingStats } from "@/types";
import type { CustomHandledCommand } from "@/types/slashCommandResponse";

interface MessagePair {
  user: Message;
  assistant?: Message;
}

interface ResponseCarouselProps {
  messages: Message[];
  streamingText?: string;
  thinkingText?: string;
  pendingToolCalls?: ToolCall[];
  isStreaming?: boolean;
  streamingStats?: StreamingStats;
  lastCommand?: CustomHandledCommand;
}

// Collapsible user message status bar
function UserMessageBar({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="mb-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5",
          "bg-bg-hover/80 border border-border/50",
          "hover:bg-bg-hover transition-colors cursor-pointer text-left",
          // Fully rounded when collapsed, top-rounded when expanded
          isExpanded ? "rounded-t-lg border-b-0" : "rounded-full"
        )}
      >
        <span className="text-accent font-mono text-xs">$</span>
        {/* Only show text preview when collapsed */}
        {!isExpanded && (
          <span className="flex-1 text-xs text-text-secondary font-mono truncate">
            {content.split("\n")[0]}
          </span>
        )}
        {isExpanded && <span className="flex-1" />}
        {/* Copy button - show on hover */}
        <span
          onClick={handleCopy}
          className={cn(
            "p-1 rounded hover:bg-bg-tertiary transition-all",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-text-secondary" />
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-text-secondary/60 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3 h-3 text-text-secondary/60 flex-shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div
          className={cn(
            "px-3 py-2 rounded-b-lg border border-border/50 border-t-0",
            "bg-bg-hover/60 max-h-[300px] overflow-auto"
          )}
        >
          <p className="text-xs text-text-primary font-mono whitespace-pre-wrap leading-relaxed">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}

export function ResponseCarousel({
  messages,
  streamingText = "",
  thinkingText = "",
  pendingToolCalls = [],
  isStreaming = false,
  streamingStats,
  lastCommand,
}: ResponseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamingScrollRef = useRef<OverlayScrollbarsComponentRef>(null);
  const slideScrollRefs = useRef<Map<string, OverlayScrollbarsComponentRef>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Check if we have streaming content
  const hasStreamingContent =
    isStreaming || streamingText || pendingToolCalls.length > 0;

  // Build message pairs - only include pairs that have assistant responses
  // Unless it's the last user message and we're NOT streaming (then show it alone)
  const messagePairs = useMemo(() => {
    const pairs: MessagePair[] = [];
    let i = 0;

    while (i < messages.length) {
      if (messages[i].role === "user") {
        const pair: MessagePair = { user: messages[i] };

        // Check if next message is assistant response
        if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
          pair.assistant = messages[i + 1];
          pairs.push(pair);
          i += 2;
        } else {
          // User message without assistant response
          // Only add it if NOT streaming (streaming slide will handle it)
          if (!hasStreamingContent) {
            pairs.push(pair);
          }
          i += 1;
        }
      } else {
        // Skip orphan assistant messages
        i += 1;
      }
    }

    return pairs;
  }, [messages, hasStreamingContent]);

  // Get the last user message for streaming slide
  const lastUserMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const totalSlides = messagePairs.length + (hasStreamingContent ? 1 : 0);

  // Auto-navigate to latest slide when content changes
  useEffect(() => {
    if (totalSlides > 0) {
      setCurrentIndex(totalSlides - 1);
    }
  }, [totalSlides]);

  // Scroll to current slide
  useEffect(() => {
    if (scrollRef.current) {
      const slideWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: currentIndex * slideWidth,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  // Helper to scroll a slide to bottom
  const scrollSlideToBottom = useCallback((ref: OverlayScrollbarsComponentRef | null, smooth = true) => {
    if (!ref) return;
    const osInstance = ref.osInstance();
    if (osInstance) {
      const { viewport } = osInstance.elements();
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: smooth ? "smooth" : "instant"
        });
      }
    }
  }, []);

  // Auto-scroll to bottom when streaming text changes
  useEffect(() => {
    if (isStreaming) {
      scrollSlideToBottom(streamingScrollRef.current);
    }
  }, [isStreaming, streamingText, thinkingText, scrollSlideToBottom]);

  // Auto-scroll to bottom when switching slides or on mount
  useEffect(() => {
    // Small delay to ensure the slide is rendered
    const timer = setTimeout(() => {
      const isStreamingSlide = hasStreamingContent && currentIndex === messagePairs.length;

      if (isStreamingSlide) {
        scrollSlideToBottom(streamingScrollRef.current, false);
      } else if (messagePairs[currentIndex]) {
        const slideRef = slideScrollRefs.current.get(messagePairs[currentIndex].user.id);
        scrollSlideToBottom(slideRef || null, false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentIndex, messagePairs, hasStreamingContent, scrollSlideToBottom]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalSlides - 1, i + 1));
  }, [totalSlides]);

  // Keyboard navigation - disabled while streaming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable navigation while streaming
      if (isStreaming) return;

      // Only handle if this container or its children are focused, or no specific element is focused
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (isInputFocused) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext, isStreaming]);

  if (totalSlides === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Type a prompt to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col" tabIndex={0}>
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "flex h-full overflow-x-auto snap-x snap-mandatory",
            "scrollbar-hide"
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Completed message pairs */}
          {messagePairs.map((pair) => (
            <div
              key={pair.user.id}
              className="flex-shrink-0 w-full h-full snap-center p-4"
            >
              <OverlayScrollbarsComponent
                ref={(ref) => {
                  if (ref) {
                    slideScrollRefs.current.set(pair.user.id, ref);
                  } else {
                    slideScrollRefs.current.delete(pair.user.id);
                  }
                }}
                className="os-theme-custom h-full"
                options={{
                  scrollbars: {
                    theme: "os-theme-custom",
                    visibility: "auto",
                    autoHide: "leave",
                    autoHideDelay: 400,
                  },
                  overflow: { x: "scroll", y: "scroll" },
                }}
                defer
              >
                <UserMessageBar content={pair.user.content} />
                {pair.assistant && (
                  <ClaudeResponseCard content={pair.assistant.content} />
                )}
              </OverlayScrollbarsComponent>
            </div>
          ))}

          {/* Streaming slide */}
          {hasStreamingContent && (
            <div className="flex-shrink-0 w-full h-full snap-center p-4">
              <OverlayScrollbarsComponent
                ref={streamingScrollRef}
                className="os-theme-custom h-full"
                options={{
                  scrollbars: {
                    theme: "os-theme-custom",
                    visibility: "auto",
                    autoHide: "leave",
                    autoHideDelay: 400,
                  },
                  overflow: { x: "scroll", y: "scroll" },
                }}
                defer
              >
                {lastUserMessage && (
                  <UserMessageBar content={lastUserMessage.content} />
                )}
                <ClaudeResponseCard
                  content={streamingText}
                  thinkingText={thinkingText}
                  isStreaming={isStreaming}
                  streamingStats={streamingStats}
                  lastCommand={lastCommand}
                />
              </OverlayScrollbarsComponent>
            </div>
          )}
        </div>

        {/* Navigation arrows - positioned at edge */}
        {totalSlides > 1 && (
          <>
            <IconButton
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0 || isStreaming}
              className={cn(
                "absolute left-1 top-1/2 -translate-y-1/2 z-10",
                "bg-bg-secondary/95 backdrop-blur-sm border border-border/50 shadow-lg",
                "hover:bg-bg-tertiary hover:border-border",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === totalSlides - 1 || isStreaming}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 z-10",
                "bg-bg-secondary/95 backdrop-blur-sm border border-border/50 shadow-lg",
                "hover:bg-bg-tertiary hover:border-border",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </IconButton>
          </>
        )}
      </div>

      {/* Pagination pips - disabled while streaming */}
      {totalSlides > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => !isStreaming && setCurrentIndex(index)}
              disabled={isStreaming}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-accent w-4"
                  : "bg-border hover:bg-text-secondary",
                isStreaming && "cursor-not-allowed opacity-50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

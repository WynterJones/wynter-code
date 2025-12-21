import { useRef, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, ScrollArea } from "@/components/ui";
import { UserMessageCard } from "./UserMessageCard";
import { ClaudeResponseCard } from "./ClaudeResponseCard";
import { cn } from "@/lib/utils";
import type { Message, ToolCall } from "@/types";

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
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

export function ResponseCarousel({
  messages,
  streamingText = "",
  thinkingText = "",
  pendingToolCalls = [],
  isStreaming = false,
  onApprove,
  onReject,
}: ResponseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const messagePairs = useMemo(() => {
    const pairs: MessagePair[] = [];
    let i = 0;

    while (i < messages.length) {
      if (messages[i].role === "user") {
        const pair: MessagePair = { user: messages[i] };
        if (i + 1 < messages.length && messages[i + 1].role === "assistant") {
          pair.assistant = messages[i + 1];
          i += 2;
        } else {
          i += 1;
        }
        pairs.push(pair);
      } else {
        i += 1;
      }
    }

    return pairs;
  }, [messages]);

  const hasStreamingContent =
    isStreaming || streamingText || pendingToolCalls.length > 0;

  const totalSlides = messagePairs.length + (hasStreamingContent ? 1 : 0);

  useEffect(() => {
    if (hasStreamingContent) {
      setCurrentIndex(totalSlides - 1);
    } else if (messagePairs.length > 0) {
      setCurrentIndex(messagePairs.length - 1);
    }
  }, [messagePairs.length, hasStreamingContent, totalSlides]);

  useEffect(() => {
    if (scrollRef.current) {
      const slideWidth = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: currentIndex * slideWidth,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const goToNext = () => {
    setCurrentIndex((i) => Math.min(totalSlides - 1, i + 1));
  };

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
    <div className="h-full flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "flex h-full overflow-x-auto snap-x snap-mandatory",
            "scrollbar-hide"
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {messagePairs.map((pair) => (
            <div
              key={pair.user.id}
              className="flex-shrink-0 w-full h-full snap-center px-2"
            >
              <ScrollArea className="h-full">
                <div className="space-y-4 py-2">
                  <div className="relative">
                    <div className="transform -translate-y-2 scale-95 opacity-70 hover:opacity-100 hover:scale-100 transition-all duration-200">
                      <UserMessageCard content={pair.user.content} isBackground />
                    </div>
                    {pair.assistant && (
                      <div className="relative -mt-4">
                        <ClaudeResponseCard
                          content={pair.assistant.content}
                          toolCalls={pair.assistant.toolCalls}
                          onApprove={onApprove}
                          onReject={onReject}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          ))}

          {hasStreamingContent && (
            <div className="flex-shrink-0 w-full h-full snap-center px-2">
              <ScrollArea className="h-full">
                <div className="space-y-4 py-2">
                  {messages.length > 0 &&
                    messages[messages.length - 1]?.role === "user" && (
                      <div className="transform -translate-y-2 scale-95 opacity-70">
                        <UserMessageCard
                          content={messages[messages.length - 1].content}
                          isBackground
                        />
                      </div>
                    )}
                  <div className="relative -mt-4">
                    <ClaudeResponseCard
                      content={streamingText}
                      toolCalls={pendingToolCalls}
                      thinkingText={thinkingText}
                      isStreaming={isStreaming}
                      onApprove={onApprove}
                      onReject={onReject}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {totalSlides > 1 && (
          <>
            <IconButton
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-10",
                "bg-bg-tertiary/90 border border-border shadow-sm",
                "disabled:opacity-30"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </IconButton>
            <IconButton
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === totalSlides - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-10",
                "bg-bg-tertiary/90 border border-border shadow-sm",
                "disabled:opacity-30"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </IconButton>
          </>
        )}
      </div>

      {totalSlides > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                index === currentIndex
                  ? "bg-accent w-4"
                  : "bg-border hover:bg-text-secondary"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

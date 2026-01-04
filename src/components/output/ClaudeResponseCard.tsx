import { useState, useMemo, useEffect, useRef, memo, useCallback, useDeferredValue } from "react";
import { Copy, Check } from "lucide-react";
import { IconButton, useAnnounce } from "@/components/ui";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ThinkingBlock } from "./ThinkingBlock";
import { InlineStreamingIndicator } from "./InlineStreamingIndicator";
import { InterspersedResponse } from "./InterspersedResponse";
import { ContextBlock, CostBlock, UsageBlock, StatusBlock, TodosBlock } from "./commands";
import { parseCommandResponse } from "@/lib/slashCommandHandler";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ToolCall, StreamingStats } from "@/types";
import type { CustomHandledCommand } from "@/types/slashCommandResponse";

interface ClaudeResponseCardProps {
  content: string;
  toolCalls?: ToolCall[];
  toolPositions?: Map<string, number>;
  thinkingText?: string;
  isStreaming?: boolean;
  streamingStats?: StreamingStats;
  lastCommand?: CustomHandledCommand;
  onApprove?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
}

export const ClaudeResponseCard = memo(function ClaudeResponseCard({
  content,
  toolCalls = [],
  toolPositions = new Map(),
  thinkingText,
  isStreaming = false,
  streamingStats,
  lastCommand,
  onApprove,
  onReject,
}: ClaudeResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const { announce } = useAnnounce();
  const wasStreamingRef = useRef(false);
  const { inlineToolView } = useSettingsStore();

  // Defer content updates to keep UI responsive during rapid updates
  const deferredContent = useDeferredValue(content);

  // Announce streaming state changes
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      announce("Generating response");
    } else if (!isStreaming && wasStreamingRef.current && content) {
      announce("Response complete");
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming, content, announce]);

  // Parse command response if this is a custom command
  const commandResponse = useMemo(() => {
    if (!lastCommand || !deferredContent || isStreaming) return null;
    return parseCommandResponse(lastCommand, deferredContent);
  }, [lastCommand, deferredContent, isStreaming]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className="relative group">
      <div
        className={cn(
          "rounded-xl p-5 border shadow-sm",
          "bg-bg-tertiary",
          isStreaming ? "border-accent/30" : "border-border/50"
        )}
      >
        {!isStreaming && (
          <div className="absolute top-3 right-3">
            <IconButton
              size="sm"
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Copy response to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-accent-green" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </IconButton>
          </div>
        )}

        {thinkingText && (
          <div className="mb-4">
            <ThinkingBlock
              content={thinkingText}
              isStreaming={isStreaming}
            />
          </div>
        )}

        {/* Render custom command UI or fallback to markdown/interspersed */}
        {commandResponse ? (
          <div className="text-base text-text-primary leading-relaxed">
            {commandResponse.type === "context" && <ContextBlock data={commandResponse.data} />}
            {commandResponse.type === "cost" && <CostBlock data={commandResponse.data} />}
            {commandResponse.type === "usage" && <UsageBlock data={commandResponse.data} />}
            {commandResponse.type === "status" && <StatusBlock data={commandResponse.data} />}
            {commandResponse.type === "todos" && <TodosBlock data={commandResponse.data} />}
          </div>
        ) : inlineToolView && (deferredContent || toolCalls.length > 0) ? (
          // Inline mode: render content with tool calls interspersed
          <div className="text-base text-text-primary leading-relaxed prose-sm">
            <InterspersedResponse
              content={deferredContent}
              toolCalls={toolCalls}
              toolPositions={toolPositions}
              isStreaming={isStreaming}
              onApprove={onApprove || (() => {})}
              onReject={onReject || (() => {})}
            />
          </div>
        ) : deferredContent ? (
          <div className="text-base text-text-primary leading-relaxed prose-sm">
            <MarkdownRenderer content={deferredContent} isStreaming={isStreaming} />
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-text-secondary">Waiting for response...</span>
          </div>
        ) : null}

        {isStreaming && streamingStats && (
          <InlineStreamingIndicator stats={streamingStats} />
        )}
      </div>
    </div>
  );
});

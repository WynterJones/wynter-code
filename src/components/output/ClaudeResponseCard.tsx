import { useState, useMemo, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { IconButton, useAnnounce } from "@/components/ui";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBlock } from "./ToolCallBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { InlineStreamingIndicator } from "./InlineStreamingIndicator";
import { ContextBlock, CostBlock, UsageBlock, StatusBlock, TodosBlock } from "./commands";
import { parseCommandResponse } from "@/lib/slashCommandHandler";
import { cn } from "@/lib/utils";
import type { ToolCall, StreamingStats } from "@/types";
import type { CustomHandledCommand } from "@/types/slashCommandResponse";

interface ClaudeResponseCardProps {
  content: string;
  toolCalls?: ToolCall[];
  thinkingText?: string;
  isStreaming?: boolean;
  streamingStats?: StreamingStats;
  lastCommand?: CustomHandledCommand;
  onApprove?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
}

export function ClaudeResponseCard({
  content,
  toolCalls = [],
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
    if (!lastCommand || !content || isStreaming) return null;
    return parseCommandResponse(lastCommand, content);
  }, [lastCommand, content, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

        {/* Render custom command UI or fallback to markdown */}
        {commandResponse ? (
          <div className="text-base text-text-primary leading-relaxed">
            {commandResponse.type === "context" && <ContextBlock data={commandResponse.data} />}
            {commandResponse.type === "cost" && <CostBlock data={commandResponse.data} />}
            {commandResponse.type === "usage" && <UsageBlock data={commandResponse.data} />}
            {commandResponse.type === "status" && <StatusBlock data={commandResponse.data} />}
            {commandResponse.type === "todos" && <TodosBlock data={commandResponse.data} />}
          </div>
        ) : content ? (
          <div className="text-base text-text-primary leading-relaxed prose-sm">
            <MarkdownRenderer content={content} />
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm text-text-secondary">Waiting for response...</span>
          </div>
        ) : null}

        {toolCalls.length > 0 && (
          <div className="mt-4 space-y-2">
            {toolCalls.map((toolCall) => (
              <ToolCallBlock
                key={toolCall.id}
                toolCall={toolCall}
                onApprove={onApprove || (() => {})}
                onReject={onReject || (() => {})}
              />
            ))}
          </div>
        )}

        {isStreaming && streamingStats && (
          <InlineStreamingIndicator stats={streamingStats} />
        )}
      </div>
    </div>
  );
}

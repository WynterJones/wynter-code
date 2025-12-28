import { useState, useMemo } from "react";
import { Copy, Check, Brain } from "lucide-react";
import { IconButton } from "@/components/ui";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBlock } from "./ToolCallBlock";
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
  const [showThinking, setShowThinking] = useState(false);

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
          <div className="mb-4 rounded-lg border border-accent/30 overflow-hidden">
            <button
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2",
                "bg-accent/5 hover:bg-accent/10 transition-colors",
                "text-left"
              )}
              onClick={() => setShowThinking(!showThinking)}
            >
              <Brain className="w-4 h-4 text-accent" />
              <span className="text-xs text-accent font-medium">
                {showThinking ? "Hide" : "Show"} thinking
              </span>
              <span className="text-xs text-text-secondary ml-auto">
                {thinkingText.length} chars
              </span>
            </button>
            {showThinking && (
              <div className="px-3 py-2 bg-bg-secondary border-t border-accent/20 max-h-48 overflow-auto">
                <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                  {thinkingText}
                </p>
              </div>
            )}
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

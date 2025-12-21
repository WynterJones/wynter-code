import { useEffect, useRef, useState } from "react";
import { Copy, Check, Brain } from "lucide-react";
import { ScrollArea, IconButton } from "@/components/ui";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallBlock } from "./ToolCallBlock";
import { StreamingStatus } from "./StreamingStatus";
import { useSessionStore } from "@/stores/sessionStore";
import type { Message, ToolCall } from "@/types";
import { cn } from "@/lib/utils";

interface OutputWindowProps {
  sessionId?: string;
}

export function OutputWindow({ sessionId }: OutputWindowProps) {
  const { getMessages, getStreamingState, updateToolCallStatus } =
    useSessionStore();
  const messages = sessionId ? getMessages(sessionId) : [];
  const streamingState = sessionId ? getStreamingState(sessionId) : null;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingState?.streamingText, streamingState?.thinkingText]);

  const handleApprove = (toolId: string) => {
    if (sessionId) {
      updateToolCallStatus(sessionId, toolId, "running");
      setTimeout(() => {
        updateToolCallStatus(sessionId, toolId, "completed", "Tool executed successfully");
      }, 1000);
    }
  };

  const handleReject = (toolId: string) => {
    if (sessionId) {
      updateToolCallStatus(sessionId, toolId, "error", "Tool execution rejected by user");
    }
  };

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-sm">No session selected</p>
          <p className="text-xs mt-1">Select or create a session to get started</p>
        </div>
      </div>
    );
  }

  const hasContent =
    messages.length > 0 ||
    streamingState?.isStreaming ||
    streamingState?.streamingText;

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Type a prompt above to get started</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full rounded-lg border border-border bg-bg-secondary">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <MessageBlock
            key={message.id}
            message={message}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}

        {/* Streaming content */}
        {streamingState?.isStreaming && (
          <StreamingBlock
            text={streamingState.streamingText}
            thinkingText={streamingState.thinkingText}
            toolCalls={streamingState.pendingToolCalls}
            stats={streamingState.stats}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

interface MessageBlockProps {
  message: Message;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function MessageBlock({ message, onApprove, onReject }: MessageBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3">
        <div className="bg-bg-hover rounded-lg p-3 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-accent font-mono text-sm">$</span>
            <span className="text-xs text-text-secondary">You</span>
          </div>
          <p className="text-sm text-text-primary font-mono whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="bg-bg-tertiary rounded-lg p-4 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            <span className="text-xs text-text-secondary">Claude</span>
          </div>
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

        {/* Response text - larger and more prominent */}
        <div className="text-base font-medium text-text-primary leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.toolCalls.map((toolCall) => (
              <ToolCallBlock
                key={toolCall.id}
                toolCall={toolCall}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StreamingBlockProps {
  text: string;
  thinkingText: string;
  toolCalls: ToolCall[];
  stats: {
    model?: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    startTime: number;
    isThinking: boolean;
    currentTool?: string;
  };
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function StreamingBlock({
  text,
  thinkingText,
  toolCalls,
  stats,
  onApprove,
  onReject,
}: StreamingBlockProps) {
  const [showThinking, setShowThinking] = useState(false);

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <StreamingStatus stats={stats} />

      {/* Thinking block (collapsible) */}
      {thinkingText && (
        <div className="rounded-lg border border-accent/30 overflow-hidden">
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
            <div className="px-3 py-2 bg-bg-tertiary border-t border-accent/20">
              <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {thinkingText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main response content */}
      {text && (
        <div className="bg-bg-tertiary rounded-lg p-4 border border-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-text-secondary">Claude</span>
          </div>

          {/* Response text - larger and more prominent */}
          <div className="text-base font-medium text-text-primary leading-relaxed">
            <MarkdownRenderer content={text} />
          </div>
        </div>
      )}

      {/* Tool calls in progress */}
      {toolCalls.length > 0 && (
        <div className="space-y-2">
          {toolCalls.map((toolCall) => (
            <ToolCallBlock
              key={toolCall.id}
              toolCall={toolCall}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}

      {/* Empty state while waiting */}
      {!text && !thinkingText && toolCalls.length === 0 && (
        <div className="bg-bg-tertiary rounded-lg p-4 border border-accent/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-text-secondary">Waiting for response...</span>
          </div>
        </div>
      )}
    </div>
  );
}

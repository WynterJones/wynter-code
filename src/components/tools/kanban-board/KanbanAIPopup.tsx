import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { IconButton } from "@/components/ui";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { MarkdownRenderer } from "@/components/output/MarkdownRenderer";
import { useKanbanAI, type AIMessage } from "@/hooks/useKanbanAI";

interface KanbanAIPopupProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

// Remove only the JSON action blocks (the ones we execute), keep other code blocks
function cleanActionBlocks(content: string): string {
  // Match complete ```json blocks that contain "actions": [
  // Use non-greedy matching and be specific about the action format
  return content
    .replace(/```json\n?\s*\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}\s*\n?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";

  const displayContent = useMemo(
    () => (isUser ? message.content : cleanActionBlocks(message.content)),
    [message.content, isUser]
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-accent text-primary-950"
            : "bg-bg-tertiary text-text-primary"
        }`}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap break-words">
            {displayContent}
          </div>
        ) : (
          <div className="kanban-ai-markdown [&_pre]:!bg-bg-primary [&_pre]:!border-border [&_.relative]:!bg-bg-primary [&_.relative]:!my-2">
            <MarkdownRenderer content={displayContent} />
          </div>
        )}
        <div
          className={`text-[10px] mt-1 ${
            isUser ? "text-primary-950/60" : "text-text-secondary"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function StreamingBubble({ text }: { text: string }) {
  const displayContent = useMemo(() => cleanActionBlocks(text), [text]);

  if (!displayContent) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-lg px-3 py-2 bg-bg-tertiary text-text-primary">
        <div className="kanban-ai-markdown [&_pre]:!bg-bg-primary [&_pre]:!border-border [&_.relative]:!bg-bg-primary [&_.relative]:!my-2">
          <MarkdownRenderer content={displayContent} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
          <span className="text-[10px] text-text-secondary">typing...</span>
        </div>
      </div>
    </div>
  );
}

export function KanbanAIPopup({
  isOpen,
  onClose,
  workspaceId,
}: KanbanAIPopupProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    streamingText,
    isStreaming,
    isSessionActive,
    sendPrompt,
    startSession,
    stopSession,
  } = useKanbanAI(workspaceId);

  // Start session when popup opens
  useEffect(() => {
    if (isOpen && !isSessionActive) {
      startSession().catch(console.error);
    }
  }, [isOpen, isSessionActive, startSession]);

  // Stop session when popup closes
  useEffect(() => {
    if (!isOpen && isSessionActive) {
      stopSession().catch(console.error);
    }
  }, [isOpen, isSessionActive, stopSession]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive or popup opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [isOpen, messages, streamingText]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !isSessionActive) return;

    setInput("");
    try {
      await sendPrompt(trimmed);
    } catch (error) {
      console.error("[KanbanAIPopup] Failed to send prompt:", error);
    }
  }, [input, isStreaming, isSessionActive, sendPrompt]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [onClose, handleSubmit]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Popup */}
      <div className="relative flex flex-col bg-bg-secondary border border-border rounded-lg w-[480px] h-[600px] max-h-[80vh] shadow-xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-text-primary">
              AI Assistant
            </h3>
            {!isSessionActive && (
              <span className="text-xs text-text-secondary">(connecting...)</span>
            )}
          </div>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <OverlayScrollbarsComponent
            className="h-full"
            options={{ scrollbars: { autoHide: "scroll" } }}
          >
            <div ref={scrollRef} className="p-4">
              {messages.length === 0 && !streamingText && (
                <div className="text-center text-text-secondary text-sm py-8">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me to manage your tasks</p>
                  <p className="text-xs mt-1 text-text-tertiary">
                    Try: &quot;Create a task to review the PR&quot;
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {streamingText && <StreamingBubble text={streamingText} />}
            </div>
          </OverlayScrollbarsComponent>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isSessionActive
                  ? "Type a message... (Cmd+Enter to send)"
                  : "Connecting..."
              }
              disabled={!isSessionActive || isStreaming}
              rows={2}
              className="flex-1 bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming || !isSessionActive}
              className="self-end px-3 py-2 bg-accent text-primary-950 rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

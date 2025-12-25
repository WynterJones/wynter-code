import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, StopCircle } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/sessionStore";

interface PromptInputProps {
  projectPath: string;
  sessionId?: string;
  onSendPrompt?: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Simple prompt input component.
 * For full functionality with file attachments and images, use EnhancedPromptInput.
 */
export function PromptInput({
  projectPath,
  sessionId,
  onSendPrompt,
  disabled = false,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    addMessage,
    createSession,
    startStreaming,
    appendStreamingText,
    finishStreaming,
    getStreamingState,
  } = useSessionStore();

  const streamingState = sessionId ? getStreamingState(sessionId) : null;
  const isStreaming = streamingState?.isStreaming || false;

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isStreaming || disabled) return;

    let currentSessionId = sessionId;

    // Create a session if none exists
    if (!currentSessionId) {
      currentSessionId = createSession(
        projectPath.split("/").pop() || "project"
      );
    }

    const userMessage = prompt.trim();
    setPrompt("");

    // Add user message
    addMessage(currentSessionId, {
      sessionId: currentSessionId,
      role: "user",
      content: userMessage,
    });

    // If custom handler provided (persistent session mode), use that
    if (onSendPrompt) {
      onSendPrompt(userMessage);
      return;
    }

    // Legacy mode - just show a message that persistent sessions should be used
    startStreaming(currentSessionId);
    appendStreamingText(
      currentSessionId,
      "Note: Please use ClaudeOutputPanel with Start Session for full Claude CLI integration.\n\n" +
      "This basic prompt input is for simple use cases only."
    );
    finishStreaming(currentSessionId);
  };

  const handleStop = () => {
    if (sessionId) {
      finishStreaming(sessionId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // ESC to stop streaming
    if (e.key === "Escape" && isStreaming) {
      handleStop();
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-lg",
        "bg-bg-tertiary border border-border",
        "focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/50",
        "transition-all duration-200"
      )}
    >
      <span className="text-accent font-mono text-sm mt-1.5">$</span>

      <textarea
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a prompt..."
        disabled={isStreaming || disabled}
        rows={1}
        className={cn(
          "flex-1 bg-transparent text-text-primary placeholder:text-text-secondary",
          "text-sm font-mono resize-none outline-none",
          "disabled:opacity-50"
        )}
        style={{
          minHeight: "24px",
          maxHeight: "200px",
        }}
      />

      {isStreaming ? (
        <IconButton
          size="sm"
          onClick={handleStop}
          className="text-accent-red hover:text-accent-red"
        >
          <StopCircle className="w-4 h-4" />
        </IconButton>
      ) : (
        <IconButton
          size="sm"
          onClick={handleSubmit}
          disabled={!prompt.trim() || disabled}
          className={cn(
            prompt.trim()
              ? "text-accent hover:text-accent"
              : "text-text-secondary"
          )}
        >
          <Send className="w-4 h-4" />
        </IconButton>
      )}
    </div>
  );
}

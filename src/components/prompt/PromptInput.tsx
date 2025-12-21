import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, StopCircle } from "lucide-react";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/sessionStore";
import { claudeService } from "@/services/claude";

interface PromptInputProps {
  projectPath: string;
  sessionId?: string;
}

export function PromptInput({ projectPath, sessionId }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    addMessage,
    createSession,
    startStreaming,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    setCurrentTool,
    updateStats,
    addPendingToolCall,
    updateToolCallStatus,
    appendToolInput,
    finishStreaming,
    getStreamingState,
    getSession,
    updateClaudeSessionId,
  } = useSessionStore();

  const streamingState = sessionId ? getStreamingState(sessionId) : null;
  const isStreaming = streamingState?.isStreaming || false;

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isStreaming) return;

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

    // Start streaming state
    startStreaming(currentSessionId);

    // Get session info for continuity and mode
    const session = getSession(currentSessionId);
    const claudeSessionId = session?.claudeSessionId || undefined;
    const permissionMode = session?.permissionMode || "default";

    try {
      await claudeService.startStreaming(
        userMessage,
        projectPath,
        currentSessionId,
        {
          onInit: (model, _cwd, newClaudeSessionId) => {
            updateStats(currentSessionId!, { model });
            if (newClaudeSessionId) {
              updateClaudeSessionId(currentSessionId!, newClaudeSessionId);
            }
          },
          onText: (text) => {
            appendStreamingText(currentSessionId!, text);
          },
          onThinking: (text) => {
            appendThinkingText(currentSessionId!, text);
          },
          onThinkingStart: () => {
            setThinking(currentSessionId!, true);
          },
          onThinkingEnd: () => {
            setThinking(currentSessionId!, false);
          },
          onToolStart: (toolName, toolId) => {
            setCurrentTool(currentSessionId!, toolName);
            addPendingToolCall(currentSessionId!, {
              id: toolId,
              name: toolName,
              input: {},
              status: "running",
            });
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(currentSessionId!, toolId, partialJson);
          },
          onToolEnd: () => {
            setCurrentTool(currentSessionId!, undefined);
          },
          onToolResult: (toolId, content) => {
            updateToolCallStatus(currentSessionId!, toolId, "completed", content);
            setCurrentTool(currentSessionId!, undefined);
          },
          onUsage: (stats) => {
            updateStats(currentSessionId!, stats);
          },
          onResult: () => {
            // Result handled by finishStreaming
          },
          onError: (error) => {
            appendStreamingText(currentSessionId!, `\n\nError: ${error}`);
          },
          onDone: (exitCode, newClaudeSessionId, finalStats) => {
            console.log("Claude streaming completed with exit code:", exitCode);
            if (newClaudeSessionId) {
              updateClaudeSessionId(currentSessionId!, newClaudeSessionId);
            }
            if (finalStats) {
              updateStats(currentSessionId!, finalStats);
            }
            finishStreaming(currentSessionId!);
          },
        },
        claudeSessionId,
        permissionMode
      );
    } catch (error) {
      console.error("Error starting streaming:", error);
      appendStreamingText(
        currentSessionId,
        `Error: ${error instanceof Error ? error.message : "Failed to send message"}`
      );
      finishStreaming(currentSessionId);
    }
  };

  const handleStop = () => {
    claudeService.stopStreaming();
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
        disabled={isStreaming}
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
          disabled={!prompt.trim()}
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

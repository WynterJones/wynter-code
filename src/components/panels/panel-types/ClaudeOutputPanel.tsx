import { useState, useRef, useCallback, useEffect } from "react";
import { GripHorizontal, Plus, Play, Square, Loader2 } from "lucide-react";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { useSessionStore } from "@/stores/sessionStore";
import { claudeService } from "@/services/claude";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";

const MIN_ACTIVITY_HEIGHT = 80;
const MAX_ACTIVITY_HEIGHT = 300;
const DEFAULT_ACTIVITY_HEIGHT = 120;

export function ClaudeOutputPanel({
  panelId: _panelId,
  projectId,
  projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const {
    activeSessionId,
    getSessionsForProject,
    getMessages,
    getStreamingState,
    updateToolCallStatus,
    createSession,
    getClaudeSessionState,
    setClaudeSessionStarting,
    setClaudeSessionReady,
    setClaudeSessionEnded,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    addPendingToolCall,
    appendToolInput,
    updateStats,
    finishStreaming,
    startStreaming,
    updateClaudeSessionId,
    getSession,
  } = useSessionStore();

  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Use panel's sessionId if set, otherwise fall back to active session
  const sessionId = panel.sessionId || activeSessionId.get(projectId);
  const sessions = getSessionsForProject(projectId);
  const currentSession = sessions.find((s) => s.id === sessionId);

  const messages = sessionId ? getMessages(sessionId) : [];
  const streamingState = sessionId ? getStreamingState(sessionId) : null;
  const claudeSessionState = sessionId ? getClaudeSessionState(sessionId) : undefined;
  const isStreaming = streamingState?.isStreaming || false;
  const isSessionActive = claudeSessionState?.status === "ready";
  const isSessionStarting = claudeSessionState?.status === "starting";

  // Update process running state
  useEffect(() => {
    onProcessStateChange(isStreaming || isSessionActive);
  }, [isStreaming, isSessionActive, onProcessStateChange]);

  // Set sessionId if not already set
  useEffect(() => {
    if (!panel.sessionId && sessionId) {
      onPanelUpdate({ sessionId });
    }
  }, [panel.sessionId, sessionId, onPanelUpdate]);

  // Cleanup on unmount - stop session
  useEffect(() => {
    return () => {
      if (sessionId && claudeService.isSessionActive(sessionId)) {
        claudeService.stopSession(sessionId).catch(console.error);
      }
    };
  }, [sessionId]);

  const allToolCalls = [
    ...messages.flatMap((m) => m.toolCalls || []),
    ...(streamingState?.pendingToolCalls || []),
  ];

  const handleStartSession = useCallback(async () => {
    if (!sessionId || !projectPath) return;

    const session = getSession(sessionId);
    const permissionMode = session?.permissionMode || "default";
    const resumeSessionId = session?.claudeSessionId || undefined;

    setClaudeSessionStarting(sessionId);

    try {
      await claudeService.startSession(
        projectPath,
        sessionId,
        {
          onSessionStarting: () => {
            console.log("[ClaudeOutputPanel] Session starting...");
          },
          onSessionReady: (info) => {
            console.log("[ClaudeOutputPanel] Session ready:", info);
            setClaudeSessionReady(sessionId, info);
            if (info.claudeSessionId) {
              updateClaudeSessionId(sessionId, info.claudeSessionId);
            }
          },
          onSessionEnded: (reason) => {
            console.log("[ClaudeOutputPanel] Session ended:", reason);
            setClaudeSessionEnded(sessionId);
            finishStreaming(sessionId);
          },
          onText: (text) => {
            appendStreamingText(sessionId, text);
          },
          onThinking: (text) => {
            appendThinkingText(sessionId, text);
          },
          onThinkingStart: () => {
            setThinking(sessionId, true);
          },
          onThinkingEnd: () => {
            setThinking(sessionId, false);
          },
          onToolStart: (toolName, toolId) => {
            addPendingToolCall(sessionId, {
              id: toolId,
              name: toolName,
              input: {},
              status: "running",
            });
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(sessionId, toolId, partialJson);
          },
          onToolEnd: () => {},
          onToolResult: (toolId, content) => {
            updateToolCallStatus(sessionId, toolId, "completed", content);
          },
          onInit: (model, _cwd, claudeSessionId) => {
            updateStats(sessionId, { model });
            if (claudeSessionId) {
              updateClaudeSessionId(sessionId, claudeSessionId);
            }
          },
          onUsage: (stats) => {
            updateStats(sessionId, stats);
          },
          onResult: () => {
            // Result from a turn - finish streaming for this turn
            finishStreaming(sessionId);
          },
          onError: (error) => {
            console.error("[ClaudeOutputPanel] Error:", error);
            appendStreamingText(sessionId, `\nError: ${error}`);
          },
        },
        permissionMode,
        resumeSessionId
      );
    } catch (error) {
      console.error("[ClaudeOutputPanel] Failed to start session:", error);
      setClaudeSessionEnded(sessionId);
    }
  }, [
    sessionId,
    projectPath,
    getSession,
    setClaudeSessionStarting,
    setClaudeSessionReady,
    setClaudeSessionEnded,
    updateClaudeSessionId,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    addPendingToolCall,
    appendToolInput,
    updateToolCallStatus,
    updateStats,
    finishStreaming,
  ]);

  const handleStopSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await claudeService.stopSession(sessionId);
      setClaudeSessionEnded(sessionId);
      finishStreaming(sessionId);
    } catch (error) {
      console.error("[ClaudeOutputPanel] Failed to stop session:", error);
    }
  }, [sessionId, setClaudeSessionEnded, finishStreaming]);

  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      if (!sessionId || !isSessionActive) return;

      // Start streaming state for this message
      startStreaming(sessionId);

      try {
        await claudeService.sendPrompt(sessionId, prompt);
      } catch (error) {
        console.error("[ClaudeOutputPanel] Failed to send prompt:", error);
        appendStreamingText(sessionId, `\nError: ${error}`);
        finishStreaming(sessionId);
      }
    },
    [sessionId, isSessionActive, startStreaming, appendStreamingText, finishStreaming]
  );

  const handleApprove = useCallback(
    async (toolId: string) => {
      if (sessionId) {
        updateToolCallStatus(sessionId, toolId, "running");
        try {
          await claudeService.sendInput(sessionId, "y\n");
        } catch (error) {
          console.error("Failed to send approval:", error);
          updateToolCallStatus(sessionId, toolId, "error", "Failed to send approval");
        }
      }
    },
    [sessionId, updateToolCallStatus]
  );

  const handleReject = useCallback(
    async (toolId: string) => {
      if (sessionId) {
        try {
          await claudeService.sendInput(sessionId, "n\n");
          updateToolCallStatus(sessionId, toolId, "error", "Tool execution rejected by user");
        } catch (error) {
          console.error("Failed to send rejection:", error);
          updateToolCallStatus(sessionId, toolId, "error", "Failed to send rejection");
        }
      }
    },
    [sessionId, updateToolCallStatus]
  );

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = resizeRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      setActivityHeight(Math.min(MAX_ACTIVITY_HEIGHT, Math.max(MIN_ACTIVITY_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleCreateSession = useCallback(() => {
    const newSessionId = createSession(projectId, "claude");
    if (newSessionId) {
      onPanelUpdate({ sessionId: newSessionId });
    }
  }, [projectId, createSession, onPanelUpdate]);

  if (!sessionId || !currentSession) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-text-secondary p-4 blueprint-grid">
        <p className="text-sm opacity-60">No session linked to this panel</p>
        <button
          onClick={handleCreateSession}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent/20 hover:bg-accent/30 text-accent transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Session
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Session control bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-bg-tertiary/30">
        {!isSessionActive && !isSessionStarting ? (
          <button
            onClick={handleStartSession}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            Start Session
          </button>
        ) : isSessionStarting ? (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Starting...
          </div>
        ) : (
          <button
            onClick={handleStopSession}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop Session
          </button>
        )}

        {isSessionActive && claudeSessionState && (
          <span className="text-[10px] text-text-secondary/60">
            {claudeSessionState.model || "Claude"} • Session Active
          </span>
        )}
      </div>

      {/* Prompt input */}
      <div className="px-3 pt-2 pb-1">
        <EnhancedPromptInput
          projectPath={projectPath}
          sessionId={sessionId}
          projectFiles={[]}
          onSendPrompt={handleSendPrompt}
          disabled={!isSessionActive}
          placeholder={
            !isSessionActive
              ? "Start a session to chat with Claude..."
              : "Type a prompt... (@ to add files, paste images)"
          }
        />
      </div>

      {/* Response area */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 pb-2">
        <div className="flex-1 overflow-hidden rounded border border-border/50 bg-bg-tertiary/30">
          <ResponseCarousel
            messages={messages}
            streamingText={streamingState?.streamingText || ""}
            thinkingText={streamingState?.thinkingText || ""}
            pendingToolCalls={streamingState?.pendingToolCalls || []}
            isStreaming={isStreaming}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>

        {/* Resize handle */}
        <div
          ref={resizeRef}
          className={cn(
            "flex items-center justify-center h-2 cursor-row-resize",
            "hover:bg-accent/10 transition-colors",
            isResizing && "bg-accent/20"
          )}
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="w-4 h-4 text-text-secondary/50" />
        </div>

        {/* Activity feed */}
        <div
          className="flex-shrink-0 rounded border border-border/50 bg-bg-tertiary/30 overflow-hidden"
          style={{ height: activityHeight }}
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-border/30 bg-bg-tertiary/50">
            <span className="text-[10px] font-medium text-text-secondary">Activity</span>
            <span className="text-[10px] text-text-secondary/60">
              {allToolCalls.length} call{allToolCalls.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ height: activityHeight - 24 }}>
            <ActivityFeed
              toolCalls={allToolCalls}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

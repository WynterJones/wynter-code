import { useState, useRef, useCallback, useEffect } from "react";
import { GripHorizontal, Plus } from "lucide-react";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { useSessionStore } from "@/stores/sessionStore";
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
  const isStreaming = streamingState?.isStreaming || false;

  // Update process running state when streaming changes
  useEffect(() => {
    onProcessStateChange(isStreaming);
  }, [isStreaming, onProcessStateChange]);

  // Set sessionId if not already set
  useEffect(() => {
    if (!panel.sessionId && sessionId) {
      onPanelUpdate({ sessionId });
    }
  }, [panel.sessionId, sessionId, onPanelUpdate]);

  const allToolCalls = [
    ...messages.flatMap((m) => m.toolCalls || []),
    ...(streamingState?.pendingToolCalls || []),
  ];

  const handleApprove = useCallback(
    (toolId: string) => {
      if (sessionId) {
        updateToolCallStatus(sessionId, toolId, "running");
        setTimeout(() => {
          updateToolCallStatus(sessionId, toolId, "completed", "Tool executed successfully");
        }, 1000);
      }
    },
    [sessionId, updateToolCallStatus]
  );

  const handleReject = useCallback(
    (toolId: string) => {
      if (sessionId) {
        updateToolCallStatus(sessionId, toolId, "error", "Tool execution rejected by user");
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
      {/* Prompt input */}
      <div className="px-3 pt-2 pb-1">
        <EnhancedPromptInput
          projectPath={projectPath}
          sessionId={sessionId}
          projectFiles={[]}
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

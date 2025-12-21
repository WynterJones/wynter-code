import { useState, useRef, useCallback, useEffect } from "react";
import { GripHorizontal } from "lucide-react";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { StreamingToolbar } from "@/components/output/StreamingToolbar";
import { useSessionStore } from "@/stores/sessionStore";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface MainContentProps {
  project: Project;
}

const MIN_ACTIVITY_HEIGHT = 100;
const MAX_ACTIVITY_HEIGHT = 400;
const DEFAULT_ACTIVITY_HEIGHT = 180;

export function MainContent({ project }: MainContentProps) {
  const { activeSessionId, getSessionsForProject, getMessages, getStreamingState, updateToolCallStatus } =
    useSessionStore();

  const sessions = getSessionsForProject(project.id);
  const currentSessionId = activeSessionId.get(project.id);
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const messages = currentSessionId ? getMessages(currentSessionId) : [];
  const streamingState = currentSessionId ? getStreamingState(currentSessionId) : null;

  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const allToolCalls = [
    ...messages.flatMap((m) => m.toolCalls || []),
    ...(streamingState?.pendingToolCalls || []),
  ];

  const handleApprove = useCallback(
    (toolId: string) => {
      if (currentSessionId) {
        updateToolCallStatus(currentSessionId, toolId, "running");
        setTimeout(() => {
          updateToolCallStatus(currentSessionId, toolId, "completed", "Tool executed successfully");
        }, 1000);
      }
    },
    [currentSessionId, updateToolCallStatus]
  );

  const handleReject = useCallback(
    (toolId: string) => {
      if (currentSessionId) {
        updateToolCallStatus(currentSessionId, toolId, "error", "Tool execution rejected by user");
      }
    },
    [currentSessionId, updateToolCallStatus]
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

  const isStreaming = streamingState?.isStreaming || false;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-accent-yellow">📁</span>
          <span className="font-mono">{project.path}</span>
        </div>
      </div>

      <div className="px-4 pt-3">
        <EnhancedPromptInput
          projectPath={project.path}
          sessionId={currentSession?.id}
          projectFiles={[]}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 pb-0">
        {!currentSessionId ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <p className="text-sm">No session selected</p>
              <p className="text-xs mt-1">Select or create a session to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="flex-1 overflow-hidden rounded-lg border border-border bg-bg-secondary"
              style={{ marginBottom: activityHeight > MIN_ACTIVITY_HEIGHT ? 0 : undefined }}
            >
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

            <div
              ref={resizeRef}
              className={cn(
                "flex items-center justify-center h-3 cursor-row-resize",
                "hover:bg-accent/10 transition-colors",
                isResizing && "bg-accent/20"
              )}
              onMouseDown={handleMouseDown}
            >
              <GripHorizontal className="w-4 h-4 text-text-secondary" />
            </div>

            <div
              className="flex-shrink-0 rounded-lg border border-border bg-bg-secondary overflow-hidden"
              style={{ height: activityHeight }}
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-bg-tertiary/50">
                <span className="text-xs font-medium text-text-secondary">Activity</span>
                <span className="text-xs text-text-secondary/60">
                  {allToolCalls.length} tool call{allToolCalls.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ height: activityHeight - 32 }}>
                <ActivityFeed
                  toolCalls={allToolCalls}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {isStreaming && streamingState && (
        <StreamingToolbar isStreaming={isStreaming} stats={streamingState.stats} />
      )}
    </div>
  );
}

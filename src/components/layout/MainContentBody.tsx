import { useState, useRef, useEffect, useCallback } from "react";
import { GripHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { ContextProgressBar } from "@/components/context";
import { cn } from "@/lib/utils";
import type { Message, ToolCall, StructuredPrompt } from "@/types";
import type { StreamingState } from "@/stores/sessionStore";
import type { ImageAttachment as FileBrowserImageAttachment } from "@/components/files/FileBrowserPopup";

const MIN_ACTIVITY_HEIGHT = 100;
const MAX_ACTIVITY_HEIGHT = 400;
const DEFAULT_ACTIVITY_HEIGHT = 180;
const COLLAPSED_ACTIVITY_HEIGHT = 32;

interface MainContentBodyProps {
  projectPath: string;
  sessionId: string | undefined;
  projectFiles: string[];
  messages: Message[];
  streamingState: StreamingState | null;
  isStreaming: boolean;
  isSessionActive: boolean;
  allToolCalls: ToolCall[];
  pendingImage?: FileBrowserImageAttachment | null;
  onImageConsumed?: () => void;
  onRequestImageBrowser?: () => void;
  onSendPrompt: (prompt: string) => void;
  onSendStructuredPrompt: (prompt: StructuredPrompt) => void;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

export function MainContentBody({
  projectPath,
  sessionId,
  projectFiles,
  messages,
  streamingState,
  isStreaming,
  isSessionActive,
  allToolCalls,
  pendingImage,
  onImageConsumed,
  onRequestImageBrowser,
  onSendPrompt,
  onSendStructuredPrompt,
  onApprove,
  onReject,
}: MainContentBodyProps) {
  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <div className="px-4 pt-3">
        <EnhancedPromptInput
          projectPath={projectPath}
          sessionId={sessionId}
          projectFiles={projectFiles}
          pendingImage={pendingImage}
          onImageConsumed={onImageConsumed}
          onRequestImageBrowser={onRequestImageBrowser}
          onSendPrompt={onSendPrompt}
          onSendStructuredPrompt={onSendStructuredPrompt}
          disabled={!isSessionActive}
          placeholder={
            !isSessionActive
              ? "Click 'Start' to begin a Claude session..."
              : "Type a prompt... (@ to add files, paste images)"
          }
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4">
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
            streamingStats={streamingState?.stats}
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
          style={{ height: isActivityCollapsed ? COLLAPSED_ACTIVITY_HEIGHT : activityHeight }}
        >
          <button
            onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
            className="w-full flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-bg-tertiary/50 hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {isActivityCollapsed ? (
                <ChevronUp className="w-3 h-3 text-text-secondary/60" />
              ) : (
                <ChevronDown className="w-3 h-3 text-text-secondary/60" />
              )}
              <span className="text-xs font-medium text-text-secondary">Activity</span>
            </div>
            <div className="flex items-center gap-3">
              <ContextProgressBar />
              <span className="text-xs text-text-secondary/60">
                {allToolCalls.length} tool call{allToolCalls.length !== 1 ? "s" : ""}
              </span>
            </div>
          </button>
          {!isActivityCollapsed && (
            <div style={{ height: activityHeight - 32 }}>
              <ActivityFeed
                toolCalls={allToolCalls}
                onApprove={onApprove}
                onReject={onReject}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

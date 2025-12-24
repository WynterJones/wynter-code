import { useState, useRef, useCallback, useEffect } from "react";
import { GripHorizontal, FolderOpen, Terminal as TerminalIcon, LayoutGrid, Columns } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { StreamingToolbar } from "@/components/output/StreamingToolbar";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { ClaudeDropdown, ClaudePopup } from "@/components/claude";
import { ModelSelector } from "@/components/model/ModelSelector";
import { PermissionModeToggle } from "@/components/session";
import { PanelLayoutContainer } from "@/components/panels";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import type { Project, PermissionMode } from "@/types";
import type { ImageAttachment } from "@/components/files/FileBrowserPopup";

interface MainContentProps {
  project: Project;
  pendingImage?: ImageAttachment | null;
  onImageConsumed?: () => void;
  onRequestImageBrowser?: () => void;
}

const MIN_ACTIVITY_HEIGHT = 100;
const MAX_ACTIVITY_HEIGHT = 400;
const DEFAULT_ACTIVITY_HEIGHT = 180;

export function MainContent({ project, pendingImage, onImageConsumed, onRequestImageBrowser }: MainContentProps) {
  const { activeSessionId, getSessionsForProject, getMessages, getStreamingState, updateToolCallStatus, updateSessionPermissionMode } =
    useSessionStore();
  const { toggleTerminal, getSessionPtyId, setSessionPtyId, getQueuedCommand, clearQueuedCommand } = useTerminalStore();
  const { useMultiPanelLayout, setUseMultiPanelLayout } = useSettingsStore();

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
  const isTerminalSession = currentSession?.type === "terminal";

  const handleTerminalPtyCreated = async (ptyId: string) => {
    if (currentSessionId) {
      setSessionPtyId(currentSessionId, ptyId);

      // Check for queued commands and execute them
      const queuedCommand = getQueuedCommand(currentSessionId);
      if (queuedCommand) {
        // Small delay to ensure terminal is ready
        setTimeout(async () => {
          try {
            await invoke("write_pty", { ptyId, data: queuedCommand + "\n" });
          } catch (err) {
            console.error("Failed to execute queued command:", err);
          }
          clearQueuedCommand(currentSessionId);
        }, 100);
      }
    }
  };

  const handleModeChange = (mode: PermissionMode) => {
    if (currentSessionId) {
      updateSessionPermissionMode(currentSessionId, mode);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      <div className="h-[45px] px-4 flex items-center justify-between border-b border-border bg-bg-secondary" data-tauri-drag-region>
        <div className="flex items-center gap-2 text-sm text-text-secondary" data-tauri-drag-region>
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" data-tauri-drag-region />
          <span className="font-mono truncate" data-tauri-drag-region>{project.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector />
          {currentSession && (
            <PermissionModeToggle
              mode={currentSession.permissionMode || "default"}
              onChange={handleModeChange}
            />
          )}
          <div className="w-px h-5 bg-border" />
          <ClaudeDropdown projectPath={project.path} />
          {!isTerminalSession && !useMultiPanelLayout && (
            <button
              onClick={() => toggleTerminal(project.id)}
              className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              title="Toggle terminal"
            >
              <TerminalIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setUseMultiPanelLayout(!useMultiPanelLayout)}
            className={cn(
              "p-1.5 rounded transition-colors",
              useMultiPanelLayout
                ? "bg-accent/20 text-accent hover:bg-accent/30"
                : "hover:bg-bg-tertiary text-text-secondary hover:text-text-primary"
            )}
            title={useMultiPanelLayout ? "Switch to classic layout" : "Switch to multi-panel layout"}
          >
            {useMultiPanelLayout ? <Columns className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Multi-panel layout mode */}
      {useMultiPanelLayout && !isTerminalSession ? (
        <PanelLayoutContainer projectId={project.id} projectPath={project.path} />
      ) : isTerminalSession && currentSessionId ? (
        <div className="flex-1 overflow-hidden">
          <Terminal
            key={currentSessionId}
            projectPath={project.path}
            ptyId={getSessionPtyId(currentSessionId)}
            onPtyCreated={handleTerminalPtyCreated}
          />
        </div>
      ) : !currentSessionId ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary blueprint-grid">
          <div className="text-center opacity-60">
            <p className="text-sm">No session selected</p>
            <p className="text-xs mt-1">Select or create a session to get started</p>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3">
            <EnhancedPromptInput
              projectPath={project.path}
              sessionId={currentSession?.id}
              projectFiles={[]}
              pendingImage={pendingImage}
              onImageConsumed={onImageConsumed}
              onRequestImageBrowser={onRequestImageBrowser}
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
          </div>
        </>
      )}

      {!isTerminalSession && !useMultiPanelLayout && (
        <TerminalPanel projectId={project.id} projectPath={project.path} />
      )}

      {isStreaming && streamingState && (
        <StreamingToolbar isStreaming={isStreaming} stats={streamingState.stats} />
      )}

      <ClaudePopup projectPath={project.path} />
    </div>
  );
}

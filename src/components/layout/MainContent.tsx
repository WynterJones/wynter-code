import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GripHorizontal, FolderOpen, Terminal as TerminalIcon, LayoutGrid, Columns, Play, Square, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { PermissionApprovalModal } from "@/components/output/PermissionApprovalModal";
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
import { claudeService } from "@/services/claude";
import { cn } from "@/lib/utils";
import type { Project, PermissionMode, ToolCall } from "@/types";
import type { ImageAttachment } from "@/components/files/FileBrowserPopup";

// Tools that typically need permission in default mode
const TOOLS_REQUIRING_PERMISSION = [
  "bash", "shell", "exec", "execute",
  "edit", "write", "delete", "remove",
  "task", "mcp__", "skill",
];

// Tools that are always auto-approved
const AUTO_APPROVED_TOOLS = [
  "read", "glob", "grep", "todowrite", "websearch", "webfetch",
];

function toolNeedsPermission(toolName: string, permissionMode: PermissionMode): boolean {
  const nameLower = toolName.toLowerCase();

  // bypassPermissions mode - nothing needs approval
  if (permissionMode === "bypassPermissions") {
    return false;
  }

  // Check if tool is always auto-approved
  if (AUTO_APPROVED_TOOLS.some(t => nameLower.includes(t))) {
    return false;
  }

  // acceptEdits mode - only bash/exec needs approval
  if (permissionMode === "acceptEdits") {
    return nameLower.includes("bash") ||
           nameLower.includes("shell") ||
           nameLower.includes("exec");
  }

  // default/plan mode - check against permission-requiring tools
  return TOOLS_REQUIRING_PERMISSION.some(t => nameLower.includes(t));
}

interface MainContentProps {
  project: Project;
  pendingImage?: ImageAttachment | null;
  onImageConsumed?: () => void;
  onRequestImageBrowser?: () => void;
}

const MIN_ACTIVITY_HEIGHT = 100;
const MAX_ACTIVITY_HEIGHT = 400;
const DEFAULT_ACTIVITY_HEIGHT = 180;
const COLLAPSED_ACTIVITY_HEIGHT = 32;

export function MainContent({ project, pendingImage, onImageConsumed, onRequestImageBrowser }: MainContentProps) {
  const {
    activeSessionId,
    getSessionsForProject,
    getMessages,
    getStreamingState,
    updateToolCallStatus,
    updateSessionPermissionMode,
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
  const { toggleTerminal, getSessionPtyId, setSessionPtyId, getQueuedCommand, clearQueuedCommand } = useTerminalStore();
  const { useMultiPanelLayout, setUseMultiPanelLayout, sidebarCollapsed, sidebarPosition } = useSettingsStore();

  const sessions = getSessionsForProject(project.id);
  const currentSessionId = activeSessionId.get(project.id);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const terminalSessions = sessions.filter((s) => s.type === "terminal");

  const messages = currentSessionId ? getMessages(currentSessionId) : [];
  const streamingState = currentSessionId ? getStreamingState(currentSessionId) : null;
  const claudeSessionState = currentSessionId ? getClaudeSessionState(currentSessionId) : undefined;
  const isSessionActive = claudeSessionState?.status === "ready";
  const isSessionStarting = claudeSessionState?.status === "starting";

  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const allToolCalls = [
    ...messages.flatMap((m) => m.toolCalls || []),
    ...(streamingState?.pendingToolCalls || []),
  ];

  // Find the first pending tool call that needs approval
  const pendingApprovalTool = useMemo<ToolCall | null>(() => {
    return allToolCalls.find(tc => tc.status === "pending") || null;
  }, [allToolCalls]);

  // Start a persistent Claude session
  const handleStartSession = useCallback(async () => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    const permissionMode = session?.permissionMode || "default";
    const resumeSessionId = session?.claudeSessionId || undefined;

    setClaudeSessionStarting(currentSessionId);

    try {
      await claudeService.startSession(
        project.path,
        currentSessionId,
        {
          onSessionStarting: () => {
            console.log("[MainContent] Session starting...");
          },
          onSessionReady: (info) => {
            console.log("[MainContent] Session ready:", info);
            setClaudeSessionReady(currentSessionId, info);
            if (info.claudeSessionId) {
              updateClaudeSessionId(currentSessionId, info.claudeSessionId);
            }
          },
          onSessionEnded: (reason) => {
            console.log("[MainContent] Session ended:", reason);
            setClaudeSessionEnded(currentSessionId);
            finishStreaming(currentSessionId);
          },
          onText: (text) => {
            appendStreamingText(currentSessionId, text);
          },
          onThinking: (text) => {
            appendThinkingText(currentSessionId, text);
          },
          onThinkingStart: () => {
            setThinking(currentSessionId, true);
          },
          onThinkingEnd: () => {
            setThinking(currentSessionId, false);
          },
          onToolStart: (toolName, toolId) => {
            // Determine if this tool needs permission approval
            const needsPermission = toolNeedsPermission(toolName, permissionMode);
            addPendingToolCall(currentSessionId, {
              id: toolId,
              name: toolName,
              input: {},
              status: needsPermission ? "pending" : "running",
            });
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(currentSessionId, toolId, partialJson);
          },
          onToolEnd: () => {},
          onToolResult: (toolId, content) => {
            updateToolCallStatus(currentSessionId, toolId, "completed", content);
            // Add separator so subsequent text appears as new block
            appendStreamingText(currentSessionId, "\n\n");
          },
          onInit: (model, _cwd, claudeSessionId) => {
            updateStats(currentSessionId, { model });
            if (claudeSessionId) {
              updateClaudeSessionId(currentSessionId, claudeSessionId);
            }
          },
          onUsage: (stats) => {
            updateStats(currentSessionId, stats);
          },
          onResult: () => {
            finishStreaming(currentSessionId);
          },
          onError: (error) => {
            console.error("[MainContent] Error:", error);
            appendStreamingText(currentSessionId, `\nError: ${error}`);
          },
        },
        permissionMode,
        resumeSessionId
      );
    } catch (error) {
      console.error("[MainContent] Failed to start session:", error);
      setClaudeSessionEnded(currentSessionId);
    }
  }, [
    currentSessionId,
    project.path,
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

  // Stop the Claude session
  const handleStopSession = useCallback(async () => {
    if (!currentSessionId) return;
    try {
      await claudeService.stopSession(currentSessionId);
      setClaudeSessionEnded(currentSessionId);
      finishStreaming(currentSessionId);
    } catch (error) {
      console.error("[MainContent] Failed to stop session:", error);
    }
  }, [currentSessionId, setClaudeSessionEnded, finishStreaming]);

  // Send prompt to active session
  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      if (!currentSessionId || !isSessionActive) return;

      startStreaming(currentSessionId);

      try {
        await claudeService.sendPrompt(currentSessionId, prompt);
      } catch (error) {
        console.error("[MainContent] Failed to send prompt:", error);
        appendStreamingText(currentSessionId, `\nError: ${error}`);
        finishStreaming(currentSessionId);
      }
    },
    [currentSessionId, isSessionActive, startStreaming, appendStreamingText, finishStreaming]
  );

  // Handle tool approval - send "y" to Claude stdin
  const handleApprove = useCallback(
    async (toolId: string) => {
      if (currentSessionId) {
        updateToolCallStatus(currentSessionId, toolId, "running");
        try {
          await claudeService.sendInput(currentSessionId, "y\n");
        } catch (error) {
          console.error("Failed to send approval:", error);
          updateToolCallStatus(currentSessionId, toolId, "error", "Failed to send approval");
        }
      }
    },
    [currentSessionId, updateToolCallStatus]
  );

  // Handle tool rejection - send "n" to Claude stdin
  const handleReject = useCallback(
    async (toolId: string) => {
      if (currentSessionId) {
        try {
          await claudeService.sendInput(currentSessionId, "n\n");
          updateToolCallStatus(currentSessionId, toolId, "error", "Tool execution rejected by user");
        } catch (error) {
          console.error("Failed to send rejection:", error);
          updateToolCallStatus(currentSessionId, toolId, "error", "Failed to send rejection");
        }
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

  const handleTerminalPtyCreated = async (sessionId: string, ptyId: string) => {
    setSessionPtyId(sessionId, ptyId);

    // Check for queued commands and execute them
    const queuedCommand = getQueuedCommand(sessionId);
    if (queuedCommand) {
      // Small delay to ensure terminal is ready
      setTimeout(async () => {
        try {
          await invoke("write_pty", { ptyId, data: queuedCommand + "\n" });
        } catch (err) {
          console.error("Failed to execute queued command:", err);
        }
        clearQueuedCommand(sessionId);
      }, 100);
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
        <div
          className="flex items-center gap-2 text-sm text-text-secondary transition-[padding] duration-200"
          data-tauri-drag-region
          style={{ paddingLeft: sidebarCollapsed && sidebarPosition === "left" ? 28 : 0 }}
        >
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" data-tauri-drag-region />
          <span className="font-mono truncate" data-tauri-drag-region>{project.path}</span>
        </div>
        <div
          className="flex items-center gap-2 transition-[padding] duration-200"
          style={{ paddingRight: sidebarCollapsed && sidebarPosition === "right" ? 28 : 0 }}
        >
          <ModelSelector />
          {currentSession && currentSession.type === "claude" && !useMultiPanelLayout && (
            <>
              {!isSessionActive && !isSessionStarting ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                  title="Start Claude session"
                >
                  <Play className="w-3 h-3" />
                  Start
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
                  title="Stop Claude session"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
              )}
            </>
          )}
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

      {/* Persistent Terminal Sessions - always mounted, hidden when not active */}
      {terminalSessions.map((session) => (
        <div
          key={session.id}
          className={cn(
            "flex-1 overflow-hidden",
            currentSessionId !== session.id && "hidden"
          )}
        >
          <Terminal
            projectPath={project.path}
            ptyId={getSessionPtyId(session.id)}
            onPtyCreated={(ptyId) => handleTerminalPtyCreated(session.id, ptyId)}
            isVisible={currentSessionId === session.id}
          />
        </div>
      ))}

      {/* Multi-panel layout mode */}
      {useMultiPanelLayout && !isTerminalSession && (
        <PanelLayoutContainer projectId={project.id} projectPath={project.path} />
      )}

      {/* Empty state */}
      {!currentSessionId && (
        <div className="flex-1 flex items-center justify-center text-text-secondary blueprint-grid">
          <div className="text-center opacity-60">
            <p className="text-sm">No session selected</p>
            <p className="text-xs mt-1">Select or create a session to get started</p>
          </div>
        </div>
      )}

      {/* Claude session content */}
      {currentSessionId && !isTerminalSession && !useMultiPanelLayout && (
        <>
          <div className="px-4 pt-3">
            <EnhancedPromptInput
              projectPath={project.path}
              sessionId={currentSession?.id}
              projectFiles={[]}
              pendingImage={pendingImage}
              onImageConsumed={onImageConsumed}
              onRequestImageBrowser={onRequestImageBrowser}
              onSendPrompt={handleSendPrompt}
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
                <span className="text-xs text-text-secondary/60">
                  {allToolCalls.length} tool call{allToolCalls.length !== 1 ? "s" : ""}
                </span>
              </button>
              {!isActivityCollapsed && (
                <div style={{ height: activityHeight - 32 }}>
                  <ActivityFeed
                    toolCalls={allToolCalls}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                </div>
              )}
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

      {/* Permission approval modal - blocks UI until user approves/rejects */}
      {pendingApprovalTool && (
        <PermissionApprovalModal
          toolCall={pendingApprovalTool}
          onApprove={() => handleApprove(pendingApprovalTool.id)}
          onReject={() => handleReject(pendingApprovalTool.id)}
        />
      )}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GripHorizontal, FolderOpen, Terminal as TerminalIcon, LayoutGrid, Columns, Play, Square, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuid } from "uuid";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { PermissionApprovalModal } from "@/components/output/PermissionApprovalModal";
import { AskUserQuestionModal } from "@/components/output/AskUserQuestionModal";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { ClaudeDropdown, ClaudePopup } from "@/components/claude";
import { ModelSelector } from "@/components/model/ModelSelector";
import { PermissionModeToggle } from "@/components/session";
import { Tooltip } from "@/components/ui";
import { PanelLayoutContainer } from "@/components/panels";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileIndexStore } from "@/stores/fileIndexStore";
import { claudeService } from "@/services/claude";
import { farmworkBridge } from "@/services/farmworkBridge";
import { cn } from "@/lib/utils";
import type { Project, PermissionMode, ToolCall, McpPermissionRequest } from "@/types";
import type { ImageAttachment } from "@/components/files/FileBrowserPopup";

// In stream-json mode, there's no interactive tool approval.
// The CLI auto-approves or auto-rejects based on --permission-mode:
// - "default": File edits rejected, user sees permission_denials in result
// - "acceptEdits": File edits auto-approved, Bash still needs approval (rejected)
// - "bypassPermissions": Everything auto-approved
// GUI doesn't need to check permissions - CLI handles it
function toolNeedsPermission(_toolName: string, _permissionMode: PermissionMode): boolean {
  return false; // CLI handles permissions in stream-json mode
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
    setPendingQuestionSet,
  } = useSessionStore();
  const { toggleTerminal, getSessionPtyId, setSessionPtyId, getQueuedCommand, clearQueuedCommand } = useTerminalStore();
  const { useMultiPanelLayout, setUseMultiPanelLayout, sidebarCollapsed, sidebarPosition, claudeSafeMode, defaultModel } = useSettingsStore();
  const { getFiles, loadIndex } = useFileIndexStore();
  const projectFiles = getFiles(project.path);

  const sessions = getSessionsForProject(project.id);
  const currentSessionId = activeSessionId.get(project.id);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const terminalSessions = sessions.filter((s) => s.type === "terminal");

  const messages = currentSessionId ? getMessages(currentSessionId) : [];
  const streamingState = currentSessionId ? getStreamingState(currentSessionId) : null;
  const claudeSessionState = currentSessionId ? getClaudeSessionState(currentSessionId) : undefined;
  const pendingQuestionSet = streamingState?.pendingQuestionSet || null;
  const isSessionActive = claudeSessionState?.status === "ready";
  const isSessionStarting = claudeSessionState?.status === "starting";

  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [pendingMcpRequest, setPendingMcpRequest] = useState<McpPermissionRequest | null>(null);
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set());
  const autoApprovedToolsRef = useRef<Set<string>>(new Set());
  const resizeRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state
  useEffect(() => {
    autoApprovedToolsRef.current = autoApprovedTools;
  }, [autoApprovedTools]);

  // Load file index for @ mentions
  useEffect(() => {
    if (project.path) {
      loadIndex(project.path);
    }
  }, [project.path, loadIndex]);

  const allToolCalls = [
    ...messages.flatMap((m) => m.toolCalls || []),
    ...(streamingState?.pendingToolCalls || []),
  ];

  // Find the first pending tool call that needs approval
  const pendingApprovalTool = useMemo<ToolCall | null>(() => {
    return allToolCalls.find(tc => tc.status === "pending") || null;
  }, [allToolCalls]);

  // Debug: Log when pendingApprovalTool changes
  useEffect(() => {
    console.log("[MainContent] pendingApprovalTool changed:", pendingApprovalTool);
    console.log("[MainContent] allToolCalls:", allToolCalls);
  }, [pendingApprovalTool, allToolCalls]);

  // Start a persistent Claude session
  const handleStartSession = useCallback(async () => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    const permissionMode = session?.permissionMode || "default";
    const resumeSessionId = session?.claudeSessionId || undefined;

    console.log("[MainContent] Starting session with:", {
      sessionId: currentSessionId,
      permissionMode,
      resumeSessionId,
      isManualMode: permissionMode === "manual",
    });

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
            console.log("[MainContent] onToolStart:", {
              toolName,
              toolId,
              permissionMode,
              needsPermission,
            });
            addPendingToolCall(currentSessionId, {
              id: toolId,
              name: toolName,
              input: {},
              status: needsPermission ? "pending" : "running",
            });
            // Notify Farmwork Tycoon bridge
            farmworkBridge.onToolStart(toolName, toolId);
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(currentSessionId, toolId, partialJson);
          },
          onToolEnd: () => {},
          onToolResult: (toolId, content, isError) => {
            // If tool had an error, mark as error status; otherwise completed
            const status = isError ? "error" : "completed";
            updateToolCallStatus(currentSessionId, toolId, status, content, isError);
            // Add separator so subsequent text appears as new block
            appendStreamingText(currentSessionId, "\n\n");
            // Notify Farmwork Tycoon bridge
            farmworkBridge.onToolComplete(toolId, isError ?? false);
          },
          onAskUserQuestion: (toolId, input) => {
            const questions = input.questions.map((q, idx) => ({
              id: `${toolId}-q${idx}`,
              header: q.header || `Question ${idx + 1}`,
              question: q.question,
              options: q.options,
              multiSelect: q.multiSelect,
            }));
            setPendingQuestionSet(currentSessionId, {
              id: uuid(),
              toolId,
              questions,
            });
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
          onPermissionRequest: async (request) => {
            console.log("[MainContent] MCP Permission request received:", {
              id: request.id,
              toolName: request.toolName,
              sessionId: request.sessionId,
              inputKeys: Object.keys(request.input || {}),
            });

            // Check if this tool is auto-approved for this session
            if (autoApprovedToolsRef.current.has(request.toolName)) {
              console.log("[MainContent] Auto-approving tool:", request.toolName);
              try {
                await claudeService.respondToPermission(request.id, true);
                console.log("[MainContent] Auto-approved successfully");
              } catch (error) {
                console.error("[MainContent] Failed to auto-approve:", error);
              }
              return;
            }

            // Show the permission modal
            setPendingMcpRequest(request);
          },
        },
        permissionMode,
        resumeSessionId,
        claudeSafeMode,
        defaultModel
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
    setPendingQuestionSet,
    claudeSafeMode,
    defaultModel,
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

  // Handle tool approval - send raw "y" to Claude stdin
  const handleApprove = useCallback(
    async (toolId: string) => {
      if (currentSessionId) {
        updateToolCallStatus(currentSessionId, toolId, "running");
        try {
          // Use raw input for tool approvals - don't wrap in JSON
          await claudeService.sendRawInput(currentSessionId, "y\n");
        } catch (error) {
          console.error("Failed to send approval:", error);
          updateToolCallStatus(currentSessionId, toolId, "error", "Failed to send approval");
        }
      }
    },
    [currentSessionId, updateToolCallStatus]
  );

  // Handle tool rejection - send raw "n" to Claude stdin
  const handleReject = useCallback(
    async (toolId: string) => {
      if (currentSessionId) {
        try {
          // Use raw input for tool rejections - don't wrap in JSON
          await claudeService.sendRawInput(currentSessionId, "n\n");
          updateToolCallStatus(currentSessionId, toolId, "error", "Tool execution rejected by user");
        } catch (error) {
          console.error("Failed to send rejection:", error);
          updateToolCallStatus(currentSessionId, toolId, "error", "Failed to send rejection");
        }
      }
    },
    [currentSessionId, updateToolCallStatus]
  );

  // MCP Permission handlers (for manual mode)
  const handleMcpApprove = useCallback(async (alwaysAllow?: boolean) => {
    if (!pendingMcpRequest) return;
    console.log("[MainContent] MCP Approve clicked, request:", {
      id: pendingMcpRequest.id,
      toolName: pendingMcpRequest.toolName,
      alwaysAllow,
    });

    // If "always allow" was checked, add this tool to auto-approved set
    if (alwaysAllow && pendingMcpRequest.toolName) {
      setAutoApprovedTools(prev => new Set([...prev, pendingMcpRequest.toolName]));
      console.log("[MainContent] Added to auto-approved tools:", pendingMcpRequest.toolName);
    }

    try {
      await claudeService.respondToPermission(pendingMcpRequest.id, true);
      console.log("[MainContent] MCP permission response sent successfully");
      setPendingMcpRequest(null);
    } catch (error) {
      console.error("[MainContent] Failed to approve MCP permission:", error);
    }
  }, [pendingMcpRequest]);

  const handleMcpReject = useCallback(async () => {
    if (!pendingMcpRequest) return;
    try {
      await claudeService.respondToPermission(pendingMcpRequest.id, false);
      setPendingMcpRequest(null);
    } catch (error) {
      console.error("Failed to reject MCP permission:", error);
    }
  }, [pendingMcpRequest]);

  // Handle question submission - format answers as JSON and send to Claude stdin
  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string[]>) => {
      if (!currentSessionId || !pendingQuestionSet) return;

      // Format the answers for Claude CLI
      const answerPayload = {
        answers: Object.entries(answers).reduce(
          (acc, [questionId, selected]) => {
            // Extract question index from ID (format: toolId-qN)
            const match = questionId.match(/-q(\d+)$/);
            if (match) {
              const idx = parseInt(match[1], 10);
              const question = pendingQuestionSet.questions[idx];
              if (question) {
                acc[question.header] = selected.join(", ");
              }
            }
            return acc;
          },
          {} as Record<string, string>
        ),
      };

      try {
        // Send formatted JSON response to Claude stdin
        await claudeService.sendInput(
          currentSessionId,
          JSON.stringify(answerPayload) + "\n"
        );
      } catch (error) {
        console.error("Failed to send question answers:", error);
      }

      // Clear the pending question set
      setPendingQuestionSet(currentSessionId, null);
    },
    [currentSessionId, pendingQuestionSet, setPendingQuestionSet]
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

  const handleModeChange = useCallback(async (mode: PermissionMode) => {
    if (!currentSessionId) return;

    const wasActive = isSessionActive;

    // Update the mode in store
    updateSessionPermissionMode(currentSessionId, mode);

    // If session is active, we need to restart it for the new mode to take effect
    if (wasActive) {
      console.log("[MainContent] Mode changed while session active, restarting session with mode:", mode);
      try {
        // Stop current session
        await claudeService.stopSession(currentSessionId);
        setClaudeSessionEnded(currentSessionId);

        // Small delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Restart will happen automatically when user clicks Start again,
        // or we can auto-restart here. For now, just notify user.
        console.log("[MainContent] Session stopped. Start again to use new mode:", mode);
      } catch (error) {
        console.error("[MainContent] Failed to restart session for mode change:", error);
      }
    }
  }, [currentSessionId, isSessionActive, updateSessionPermissionMode, setClaudeSessionEnded]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      <div className="h-[45px] px-4 flex items-center justify-between border-b border-border bg-bg-secondary" data-tauri-drag-region>
        <div
          className="flex items-center gap-2 text-sm text-text-secondary transition-[padding] duration-200"
          data-tauri-drag-region
          style={{ paddingLeft: sidebarPosition === "left" ? (sidebarCollapsed ? 28 : 16) : 0 }}
        >
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" data-tauri-drag-region />
          <span className="font-mono truncate" data-tauri-drag-region>{project.path}</span>
        </div>
        <div
          className="flex items-center gap-2 transition-[padding] duration-200"
          style={{ paddingRight: sidebarPosition === "right" ? (sidebarCollapsed ? 28 : 16) : 0 }}
        >
          {currentSession && currentSession.type === "claude" && !useMultiPanelLayout && (
            <>
              {!isSessionActive && !isSessionStarting ? (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-2 px-3 h-8 rounded-md text-sm bg-bg-tertiary border border-accent-green/50 hover:border-accent-green hover:bg-accent-green/10 text-accent-green transition-colors"
                  title="Start Claude session"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </button>
              ) : isSessionStarting ? (
                <div className="flex items-center gap-2 px-3 h-8 rounded-md text-sm bg-bg-tertiary border border-yellow-500/50 text-yellow-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Starting...</span>
                </div>
              ) : (
                <button
                  onClick={handleStopSession}
                  className="flex items-center gap-2 px-3 h-8 rounded-md text-sm bg-bg-tertiary border border-accent-red/50 hover:border-accent-red hover:bg-accent-red/10 text-accent-red transition-colors"
                  title="Stop Claude session"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              )}
            </>
          )}
          <ModelSelector />
          {currentSession && (
            <PermissionModeToggle
              mode={currentSession.permissionMode || "default"}
              onChange={handleModeChange}
            />
          )}
          <div className="w-px h-5 bg-border" />
          <Tooltip content="Claude Code Manager" side="bottom">
            <ClaudeDropdown projectPath={project.path} />
          </Tooltip>
          {!isTerminalSession && !useMultiPanelLayout && (
            <Tooltip content="Quick Terminal" side="bottom">
              <button
                onClick={() => toggleTerminal(project.id)}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <TerminalIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <Tooltip content={useMultiPanelLayout ? "Exit Panel Mode" : "Panel Layout"} side="bottom">
            <button
              onClick={() => setUseMultiPanelLayout(!useMultiPanelLayout)}
              className={cn(
                "p-1.5 rounded transition-colors",
                useMultiPanelLayout
                  ? "bg-accent/20 text-accent hover:bg-accent/30"
                  : "hover:bg-bg-tertiary text-text-secondary hover:text-text-primary"
              )}
            >
              {useMultiPanelLayout ? <Columns className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </Tooltip>
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
        <PanelLayoutContainer projectId={project.id} projectPath={project.path} sessionId={currentSessionId} />
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
              projectFiles={projectFiles}
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

      <ClaudePopup projectPath={project.path} />

      {/* Permission approval modal - blocks UI until user approves/rejects */}
      {pendingApprovalTool && (
        <PermissionApprovalModal
          toolCall={pendingApprovalTool}
          onApprove={() => handleApprove(pendingApprovalTool.id)}
          onReject={() => handleReject(pendingApprovalTool.id)}
        />
      )}

      {/* MCP Permission modal - for manual mode permission requests */}
      {pendingMcpRequest && (
        <PermissionApprovalModal
          toolCall={{
            id: pendingMcpRequest.id,
            name: pendingMcpRequest.toolName,
            input: pendingMcpRequest.input,
            status: "pending",
          }}
          onApprove={handleMcpApprove}
          onReject={handleMcpReject}
        />
      )}

      {/* AskUserQuestion modal - for Claude plan mode questions */}
      {pendingQuestionSet && (
        <AskUserQuestionModal
          questionSet={pendingQuestionSet}
          onSubmit={handleQuestionSubmit}
        />
      )}
    </div>
  );
}

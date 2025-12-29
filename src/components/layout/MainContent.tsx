import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GripHorizontal, FolderOpen, Terminal as TerminalIcon, LayoutGrid, Columns, ChevronDown, ChevronUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuid } from "uuid";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { PermissionApprovalModal } from "@/components/output/PermissionApprovalModal";
import { AskUserQuestionModal } from "@/components/output/AskUserQuestionModal";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { ClaudePopup } from "@/components/claude";
import { ProviderDropdown } from "@/components/provider/ProviderDropdown";
import { ModelSelector } from "@/components/model/ModelSelector";
import { PermissionModeToggle, StartButton } from "@/components/session";
import { Tooltip } from "@/components/ui";
import { PanelLayoutContainer } from "@/components/panels";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileIndexStore } from "@/stores/fileIndexStore";
import { claudeService } from "@/services/claude";
import { codexService } from "@/services/codex";
import { geminiService } from "@/services/gemini";
import { farmworkBridge } from "@/services/farmworkBridge";
import { cn } from "@/lib/utils";
import type { Project, PermissionMode, ToolCall, McpPermissionRequest, AIProvider } from "@/types";
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
    updateProviderSessionId,
    updateSessionProvider,
    getSession,
    setPendingQuestionSet,
  } = useSessionStore();
  const { toggleTerminal, getSessionPtyId, setSessionPtyId, getQueuedCommand, clearQueuedCommand } = useTerminalStore();
  const { useMultiPanelLayout, setUseMultiPanelLayout, sidebarCollapsed, sidebarPosition, claudeSafeMode, defaultModel, defaultCodexModel, defaultGeminiModel, installedProviders } = useSettingsStore();
  const { getFiles, loadIndex } = useFileIndexStore();
  const projectFiles = getFiles(project.path);

  // Use selector to get current session with proper reactivity
  const currentSession = useSessionStore((state) => {
    const currentSessionId = state.activeSessionId.get(project.id);
    if (!currentSessionId) return undefined;
    const projectSessions = state.sessions.get(project.id);
    return projectSessions?.find(s => s.id === currentSessionId);
  });

  const sessions = getSessionsForProject(project.id);
  const currentSessionId = activeSessionId.get(project.id);
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

  // Start a persistent AI session (Claude or Codex based on provider)
  const handleStartSession = useCallback(async () => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    const permissionMode = session?.permissionMode || "default";
    const resumeSessionId = session?.providerSessionId || undefined;
    const provider = session?.provider || "claude";

    // Get the correct model based on provider
    const model = provider === "codex"
      ? defaultCodexModel
      : provider === "gemini"
        ? defaultGeminiModel
        : defaultModel;

    console.log("[MainContent] Starting session with:", {
      sessionId: currentSessionId,
      provider,
      model,
      permissionMode,
      resumeSessionId,
      isManualMode: permissionMode === "manual",
    });

    setClaudeSessionStarting(currentSessionId);

    // Common callbacks for both providers
    const commonCallbacks = {
      onSessionStarting: () => {
        console.log("[MainContent] Session starting...");
      },
      onSessionReady: (info: { model?: string; providerSessionId?: string }) => {
        console.log("[MainContent] Session ready:", info);
        setClaudeSessionReady(currentSessionId, info);
        if (info.providerSessionId) {
          updateProviderSessionId(currentSessionId, info.providerSessionId);
        }
      },
      onSessionEnded: (reason: string) => {
        console.log("[MainContent] Session ended:", reason);
        setClaudeSessionEnded(currentSessionId);
        finishStreaming(currentSessionId);
      },
      onText: (text: string) => {
        appendStreamingText(currentSessionId, text);
      },
      onThinking: (text: string) => {
        appendThinkingText(currentSessionId, text);
      },
      onThinkingStart: () => {
        setThinking(currentSessionId, true);
      },
      onThinkingEnd: () => {
        setThinking(currentSessionId, false);
      },
      onToolStart: (toolName: string, toolId: string) => {
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
      onToolInputDelta: (toolId: string, partialJson: string) => {
        appendToolInput(currentSessionId, toolId, partialJson);
      },
      onToolEnd: () => {},
      onToolResult: (toolId: string, content: string, isError?: boolean) => {
        // If tool had an error, mark as error status; otherwise completed
        const status = isError ? "error" : "completed";
        updateToolCallStatus(currentSessionId, toolId, status, content, isError);
        // Add separator so subsequent text appears as new block
        appendStreamingText(currentSessionId, "\n\n");
        // Notify Farmwork Tycoon bridge
        farmworkBridge.onToolComplete(toolId, isError ?? false);
      },
      onInit: (modelName: string, _cwd: string, providerSessionId?: string) => {
        updateStats(currentSessionId, { model: modelName });
        if (providerSessionId) {
          updateProviderSessionId(currentSessionId, providerSessionId);
        }
      },
      onUsage: (stats: Record<string, unknown>) => {
        updateStats(currentSessionId, stats);
      },
      onResult: () => {
        finishStreaming(currentSessionId);
      },
      onError: (error: string) => {
        console.error("[MainContent] Error:", error);
        appendStreamingText(currentSessionId, `\nError: ${error}`);
      },
    };

    try {
      if (provider === "codex") {
        // Start Codex session with permission mode support
        await codexService.startSession(
          project.path,
          currentSessionId,
          commonCallbacks,
          resumeSessionId,
          model,
          permissionMode,
          claudeSafeMode
        );
      } else if (provider === "gemini") {
        // Start Gemini session (stateless, no resume support)
        await geminiService.startSession(
          project.path,
          currentSessionId,
          commonCallbacks,
          model,
          permissionMode,
          claudeSafeMode
        );
      } else {
        // Start Claude session (default)
        await claudeService.startSession(
          project.path,
          currentSessionId,
          {
            ...commonCallbacks,
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
          model
        );
      }
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
    updateProviderSessionId,
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
    defaultCodexModel,
    defaultGeminiModel,
  ]);

  // Stop the AI session (Claude or Codex based on provider)
  const handleStopSession = useCallback(async () => {
    if (!currentSessionId) return;
    const session = getSession(currentSessionId);
    const provider = session?.provider || "claude";

    try {
      if (provider === "codex") {
        await codexService.stopSession(currentSessionId);
      } else if (provider === "gemini") {
        await geminiService.stopSession(currentSessionId);
      } else {
        await claudeService.stopSession(currentSessionId);
      }
      setClaudeSessionEnded(currentSessionId);
      finishStreaming(currentSessionId);
    } catch (error) {
      console.error("[MainContent] Failed to stop session:", error);
    }
  }, [currentSessionId, getSession, setClaudeSessionEnded, finishStreaming]);

  // Change the AI provider for the current session
  const handleProviderChange = useCallback((provider: AIProvider) => {
    if (!currentSessionId) return;
    updateSessionProvider(currentSessionId, provider);
  }, [currentSessionId, updateSessionProvider]);

  // Send prompt to active session (Claude or Codex based on provider)
  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      if (!currentSessionId || !isSessionActive) return;

      const session = getSession(currentSessionId);
      const provider = session?.provider || "claude";

      startStreaming(currentSessionId);

      try {
        if (provider === "codex") {
          await codexService.sendPrompt(currentSessionId, prompt);
        } else if (provider === "gemini") {
          await geminiService.sendPrompt(currentSessionId, prompt);
        } else {
          await claudeService.sendPrompt(currentSessionId, prompt);
        }
      } catch (error) {
        console.error("[MainContent] Failed to send prompt:", error);
        appendStreamingText(currentSessionId, `\nError: ${error}`);
        finishStreaming(currentSessionId);
      }
    },
    [currentSessionId, isSessionActive, getSession, startStreaming, appendStreamingText, finishStreaming]
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
          className="flex items-center gap-2 text-sm text-text-secondary transition-[padding] duration-200 flex-1 min-w-0 overflow-hidden"
          data-tauri-drag-region
          style={{ paddingLeft: sidebarPosition === "left" ? (sidebarCollapsed ? 28 : 16) : 0 }}
        >
          <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" data-tauri-drag-region />
          <span className="font-mono truncate min-w-0" data-tauri-drag-region>{project.path}</span>
        </div>
        <div
          className="flex items-center gap-2 transition-[padding] duration-200"
          style={{ paddingRight: sidebarPosition === "right" ? (sidebarCollapsed ? 28 : 16) : 0 }}
        >
          {currentSession && currentSession.type === "claude" && !useMultiPanelLayout && (
            <StartButton
              onStart={handleStartSession}
              onStop={handleStopSession}
              onProviderChange={handleProviderChange}
              currentProvider={currentSession.provider}
              installedProviders={installedProviders}
              isStarting={isSessionStarting}
              isActive={isSessionActive}
            />
          )}
          <ModelSelector projectId={project.id} />
          {currentSession && (
            <PermissionModeToggle
              mode={currentSession.permissionMode || "default"}
              onChange={handleModeChange}
              provider={currentSession.provider}
            />
          )}
          <div className="w-px h-5 bg-border" />
          <ProviderDropdown provider={currentSession?.provider || "claude"} projectPath={project.path} />
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

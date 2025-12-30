import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GripHorizontal, Plus, Play, Square, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { v4 as uuid } from "uuid";
import { ResponseCarousel } from "@/components/output/ResponseCarousel";
import { ActivityFeed } from "@/components/output/ActivityFeed";
import { PermissionApprovalModal } from "@/components/output/PermissionApprovalModal";
import { AskUserQuestionModal } from "@/components/output/AskUserQuestionModal";
import { EnhancedPromptInput } from "@/components/prompt/EnhancedPromptInput";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileIndexStore } from "@/stores/fileIndexStore";
import { claudeService } from "@/services/claude";
import { farmworkBridge } from "@/services/farmworkBridge";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";
import type { PermissionMode, ToolCall, McpPermissionRequest, StructuredPrompt } from "@/types";
import {
  extractCommandName,
  isCustomHandledCommand,
  isLocalOnlyCommand,
} from "@/lib/slashCommandHandler";

// In stream-json mode, there's no interactive tool approval.
// The CLI auto-approves or auto-rejects based on --permission-mode:
// - "default": File edits rejected, user sees permission_denials in result
// - "acceptEdits": File edits auto-approved, Bash still needs approval (rejected)
// - "bypassPermissions": Everything auto-approved
// GUI doesn't need to check permissions - CLI handles it
function toolNeedsPermission(_toolName: string, _permissionMode: PermissionMode): boolean {
  return false; // CLI handles permissions in stream-json mode
}

const MIN_ACTIVITY_HEIGHT = 80;
const MAX_ACTIVITY_HEIGHT = 300;
const DEFAULT_ACTIVITY_HEIGHT = 120;
const COLLAPSED_ACTIVITY_HEIGHT = 28;

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
    updateProviderSessionId,
    getSession,
    setPendingQuestionSet,
    updateSessionPermissionMode,
    clearMessages,
    setLastCommand,
  } = useSessionStore();
  const { claudeSafeMode, defaultModel } = useSettingsStore();
  const { getFiles, loadIndex } = useFileIndexStore();
  const projectFiles = getFiles(projectPath);

  const [activityHeight, setActivityHeight] = useState(DEFAULT_ACTIVITY_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);
  const [pendingMcpRequest, setPendingMcpRequest] = useState<McpPermissionRequest | null>(null);
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
  const isPlanMode = currentSession?.permissionMode === "plan";

  // Update process running state
  useEffect(() => {
    onProcessStateChange(isStreaming || isSessionActive);
  }, [isStreaming, isSessionActive, onProcessStateChange]);

  // Load file index for @ mentions
  useEffect(() => {
    if (projectPath) {
      loadIndex(projectPath);
    }
  }, [projectPath, loadIndex]);

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

  // Find the first pending tool call that needs approval
  const pendingApprovalTool = useMemo<ToolCall | null>(() => {
    return allToolCalls.find(tc => tc.status === "pending") || null;
  }, [allToolCalls]);

  // Debug: Log when pendingApprovalTool changes
  useEffect(() => {
  }, [pendingApprovalTool, allToolCalls]);

  // Get pending question set
  const pendingQuestionSet = streamingState?.pendingQuestionSet || null;

  const handleStartSession = useCallback(async () => {
    if (!sessionId || !projectPath) return;

    const session = getSession(sessionId);
    const permissionMode = session?.permissionMode || "default";

    // Only resume if there are existing messages (true continuation)
    // Don't resume for fresh starts - the old thread might be expired
    const existingMessages = getMessages(sessionId);
    const resumeSessionId = existingMessages.length > 0
      ? (session?.providerSessionId || undefined)
      : undefined;

    setClaudeSessionStarting(sessionId);

    try {
      await claudeService.startSession(
        projectPath,
        sessionId,
        {
          onSessionStarting: () => {
          },
          onSessionReady: (info) => {
            setClaudeSessionReady(sessionId, info);
            if (info.providerSessionId) {
              updateProviderSessionId(sessionId, info.providerSessionId);
            }
          },
          onSessionEnded: (_reason) => {
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
            // Determine if this tool needs permission approval
            const needsPermission = toolNeedsPermission(toolName, permissionMode);
            addPendingToolCall(sessionId, {
              id: toolId,
              name: toolName,
              input: {},
              status: needsPermission ? "pending" : "running",
            });
            // Notify Farmwork Tycoon bridge
            farmworkBridge.onToolStart(toolName, toolId);
          },
          onToolInputDelta: (toolId, partialJson) => {
            appendToolInput(sessionId, toolId, partialJson);
          },
          onToolEnd: () => {},
          onToolResult: (toolId, content, isError) => {
            // If tool had an error, mark as error status; otherwise completed
            const status = isError ? "error" : "completed";
            updateToolCallStatus(sessionId, toolId, status, content, isError);
            // Add separator so subsequent text appears as new block
            appendStreamingText(sessionId, "\n\n");
            // Notify Farmwork Tycoon bridge
            farmworkBridge.onToolComplete(toolId, isError ?? false);
          },
          onAskUserQuestion: (toolId, input) => {
            // Convert to PendingQuestionSet format
            const questions = input.questions.map((q, idx) => ({
              id: `${toolId}-q${idx}`,
              header: q.header || `Question ${idx + 1}`,
              question: q.question,
              options: q.options,
              multiSelect: q.multiSelect,
            }));
            setPendingQuestionSet(sessionId, {
              id: uuid(),
              toolId,
              questions,
            });
          },
          onInit: (model, _cwd, providerSessionId) => {
            updateStats(sessionId, { model });
            if (providerSessionId) {
              updateProviderSessionId(sessionId, providerSessionId);
            }
          },
          onUsage: (stats, isFinal) => {
            updateStats(sessionId, stats, isFinal);
          },
          onResult: () => {
            // Result from a turn - finish streaming for this turn
            finishStreaming(sessionId);
          },
          onError: (error) => {
            console.error("[ClaudeOutputPanel] Error:", error);
            appendStreamingText(sessionId, `\nError: ${error}`);
          },
          onPermissionRequest: (request) => {
            setPendingMcpRequest(request);
          },
        },
        permissionMode,
        resumeSessionId,
        claudeSafeMode,
        defaultModel
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
    updateProviderSessionId,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    addPendingToolCall,
    appendToolInput,
    updateToolCallStatus,
    updateStats,
    finishStreaming,
    claudeSafeMode,
    setPendingQuestionSet,
    defaultModel,
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

      // Check for slash commands with custom handling
      const commandName = extractCommandName(prompt);

      // Handle /clear locally - no CLI call needed
      if (commandName && isLocalOnlyCommand(commandName)) {
        if (commandName === "clear") {
          clearMessages(sessionId);
        }
        return;
      }

      // Track custom commands for response parsing
      if (commandName && isCustomHandledCommand(commandName)) {
        setLastCommand(sessionId, commandName);
      } else {
        setLastCommand(sessionId, undefined);
      }

      // Start streaming state first - this creates the new slide
      startStreaming(sessionId);

      // Wait for slide animation to complete before sending prompt
      // This creates a smoother UX: slide first, then stream response
      await new Promise(resolve => setTimeout(resolve, 350));

      try {
        await claudeService.sendPrompt(sessionId, prompt);
      } catch (error) {
        console.error("[ClaudeOutputPanel] Failed to send prompt:", error);
        appendStreamingText(sessionId, `\nError: ${error}`);
        finishStreaming(sessionId);
      }
    },
    [sessionId, isSessionActive, startStreaming, appendStreamingText, finishStreaming, clearMessages, setLastCommand]
  );

  const handleSendStructuredPrompt = useCallback(
    async (prompt: StructuredPrompt) => {
      if (!sessionId || !isSessionActive) return;

      // Check for slash commands in structured prompt text
      const commandName = extractCommandName(prompt.text);

      // Handle /clear locally - no CLI call needed
      if (commandName && isLocalOnlyCommand(commandName)) {
        if (commandName === "clear") {
          clearMessages(sessionId);
        }
        return;
      }

      // Track custom commands for response parsing
      if (commandName && isCustomHandledCommand(commandName)) {
        setLastCommand(sessionId, commandName);
      } else {
        setLastCommand(sessionId, undefined);
      }

      // Start streaming state first - this creates the new slide
      startStreaming(sessionId);

      // Wait for slide animation to complete before sending prompt
      // This creates a smoother UX: slide first, then stream response
      await new Promise(resolve => setTimeout(resolve, 350));

      try {
        await claudeService.sendStructuredPrompt(sessionId, prompt);
      } catch (error) {
        console.error("[ClaudeOutputPanel] Failed to send structured prompt:", error);
        appendStreamingText(sessionId, `\nError: ${error}`);
        finishStreaming(sessionId);
      }
    },
    [sessionId, isSessionActive, startStreaming, appendStreamingText, finishStreaming, clearMessages, setLastCommand]
  );

  const handleApprove = useCallback(
    async (toolId: string) => {
      if (sessionId) {
        updateToolCallStatus(sessionId, toolId, "running");
        try {
          // Use raw input for tool approvals - don't wrap in JSON
          await claudeService.sendRawInput(sessionId, "y\n");
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
          // Use raw input for tool rejections - don't wrap in JSON
          await claudeService.sendRawInput(sessionId, "n\n");
          updateToolCallStatus(sessionId, toolId, "error", "Tool execution rejected by user");
        } catch (error) {
          console.error("Failed to send rejection:", error);
          updateToolCallStatus(sessionId, toolId, "error", "Failed to send rejection");
        }
      }
    },
    [sessionId, updateToolCallStatus]
  );

  // MCP Permission handlers (for manual mode)
  const handleMcpApprove = useCallback(async () => {
    if (!pendingMcpRequest) return;
    try {
      await claudeService.respondToPermission(pendingMcpRequest.id, true);
      setPendingMcpRequest(null);
    } catch (error) {
      console.error("Failed to approve MCP permission:", error);
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

  // Execute Plan - switch from plan mode to acceptEdits and restart session
  const handleExecutePlan = useCallback(async () => {
    if (!sessionId || !projectPath || !isPlanMode) return;

    try {
      // Stop current session
      await claudeService.stopSession(sessionId);
      setClaudeSessionEnded(sessionId);

      // Update permission mode to acceptEdits
      updateSessionPermissionMode(sessionId, "acceptEdits");

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Restart session with new mode
      const session = getSession(sessionId);
      const resumeSessionId = session?.providerSessionId || undefined;

      setClaudeSessionStarting(sessionId);

      await claudeService.startSession(
        projectPath,
        sessionId,
        {
          onSessionStarting: () => {
          },
          onSessionReady: (info) => {
            setClaudeSessionReady(sessionId, info);
            if (info.providerSessionId) {
              updateProviderSessionId(sessionId, info.providerSessionId);
            }
          },
          onSessionEnded: (_reason) => {
            setClaudeSessionEnded(sessionId);
            finishStreaming(sessionId);
          },
          onText: (text) => appendStreamingText(sessionId, text),
          onThinking: (text) => appendThinkingText(sessionId, text),
          onThinkingStart: () => setThinking(sessionId, true),
          onThinkingEnd: () => setThinking(sessionId, false),
          onToolStart: (toolName, toolId) => {
            addPendingToolCall(sessionId, {
              id: toolId,
              name: toolName,
              input: {},
              status: "running",
            });
            farmworkBridge.onToolStart(toolName, toolId);
          },
          onToolInputDelta: (toolId, partialJson) => appendToolInput(sessionId, toolId, partialJson),
          onToolEnd: () => {},
          onToolResult: (toolId, content, isError) => {
            updateToolCallStatus(sessionId, toolId, isError ? "error" : "completed", content, isError);
            appendStreamingText(sessionId, "\n\n");
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
            setPendingQuestionSet(sessionId, { id: uuid(), toolId, questions });
          },
          onInit: (model, _cwd, providerSessionId) => {
            updateStats(sessionId, { model });
            if (providerSessionId) updateProviderSessionId(sessionId, providerSessionId);
          },
          onUsage: (stats, isFinal) => updateStats(sessionId, stats, isFinal),
          onResult: () => finishStreaming(sessionId),
          onError: (error) => {
            console.error("[ClaudeOutputPanel] Error (execute plan):", error);
            appendStreamingText(sessionId, `\nError: ${error}`);
          },
        },
        "acceptEdits",
        resumeSessionId,
        claudeSafeMode,
        defaultModel
      );
    } catch (error) {
      console.error("[ClaudeOutputPanel] Failed to execute plan:", error);
      setClaudeSessionEnded(sessionId);
    }
  }, [
    sessionId,
    projectPath,
    isPlanMode,
    setClaudeSessionEnded,
    updateSessionPermissionMode,
    getSession,
    setClaudeSessionStarting,
    setClaudeSessionReady,
    updateProviderSessionId,
    finishStreaming,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    addPendingToolCall,
    appendToolInput,
    updateToolCallStatus,
    updateStats,
    setPendingQuestionSet,
    claudeSafeMode,
    defaultModel,
  ]);

  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string[]>) => {
      if (!sessionId || !pendingQuestionSet) return;

      try {
        // Format the response as JSON for Claude CLI
        const response = JSON.stringify({ answers }) + "\n";
        await claudeService.sendInput(sessionId, response);
        // Clear the pending question
        setPendingQuestionSet(sessionId, null);
      } catch (error) {
        console.error("Failed to send question response:", error);
      }
    },
    [sessionId, pendingQuestionSet, setPendingQuestionSet]
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-bg-tertiary/30">
        {!isSessionActive && !isSessionStarting ? (
          <button
            onClick={handleStartSession}
            className="flex items-center gap-2 px-3 h-7 rounded-md text-xs bg-bg-tertiary border border-accent-green/50 hover:border-accent-green hover:bg-accent-green/10 text-accent-green transition-colors"
            title="Start Claude session"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start</span>
          </button>
        ) : isSessionStarting ? (
          <div className="flex items-center gap-2 px-3 h-7 rounded-md text-xs bg-bg-tertiary border border-yellow-500/50 text-yellow-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Starting...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 h-7 text-xs text-accent-green bg-bg-tertiary rounded-md border border-accent-green/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
              </span>
              <span>Running</span>
              {claudeSessionState && (
                <span className="text-accent-green/60">
                  {claudeSessionState.model?.replace("claude-", "").split("-")[0] || "Claude"}
                  {isPlanMode && " • Plan"}
                </span>
              )}
            </div>
            <button
              onClick={handleStopSession}
              className="flex items-center gap-2 px-3 h-7 rounded-md text-xs bg-bg-tertiary border border-accent-red/50 hover:border-accent-red hover:bg-accent-red/10 text-accent-red transition-colors"
              title="Stop Claude session"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
            {isPlanMode && (
              <button
                onClick={handleExecutePlan}
                className="flex items-center gap-2 px-3 h-7 rounded-md text-xs bg-bg-tertiary border border-accent-green/50 hover:border-accent-green hover:bg-accent-green/10 text-accent-green transition-colors"
                title="Execute Plan"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Prompt input */}
      <div className="px-3 pt-2 pb-1">
        <EnhancedPromptInput
          projectPath={projectPath}
          sessionId={sessionId}
          projectFiles={projectFiles}
          onSendPrompt={handleSendPrompt}
          onSendStructuredPrompt={handleSendStructuredPrompt}
          disabled={!isSessionActive}
          placeholder={
            !isSessionActive
              ? "Start a session to chat with Claude..."
              : "Type a prompt... (@ to add files, paste images)"
          }
        />
      </div>

      {/* Response area */}
      <div className="flex-1 flex flex-col min-h-0 px-3 pb-2">
        <div className="flex-1 min-h-0 overflow-hidden rounded border border-border/50 bg-bg-tertiary/30">
          <ResponseCarousel
            messages={messages}
            streamingText={streamingState?.streamingText || ""}
            thinkingText={streamingState?.thinkingText || ""}
            pendingToolCalls={streamingState?.pendingToolCalls || []}
            isStreaming={isStreaming}
            streamingStats={streamingState?.stats}
            lastCommand={streamingState?.lastCommand}
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
          style={{ height: isActivityCollapsed ? COLLAPSED_ACTIVITY_HEIGHT : activityHeight }}
        >
          <button
            onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
            className="w-full flex items-center justify-between px-2 py-1 border-b border-border/30 bg-bg-tertiary/50 hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {isActivityCollapsed ? (
                <ChevronUp className="w-3 h-3 text-text-secondary/60" />
              ) : (
                <ChevronDown className="w-3 h-3 text-text-secondary/60" />
              )}
              <span className="text-[10px] font-medium text-text-secondary">Activity</span>
            </div>
            <span className="text-[10px] text-text-secondary/60">
              {allToolCalls.length} call{allToolCalls.length !== 1 ? "s" : ""}
            </span>
          </button>
          {!isActivityCollapsed && (
            <div style={{ height: activityHeight - 24 }}>
              <ActivityFeed
                toolCalls={allToolCalls}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          )}
        </div>
      </div>

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

      {/* Ask user question modal - for plan mode questions */}
      {pendingQuestionSet && (
        <AskUserQuestionModal
          questionSet={pendingQuestionSet}
          onSubmit={handleQuestionSubmit}
        />
      )}
    </div>
  );
}

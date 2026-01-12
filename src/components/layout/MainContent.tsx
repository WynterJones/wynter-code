import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { Terminal } from "@/components/terminal/Terminal";
import { ClaudePopup } from "@/components/claude";
import { CodespaceEditor } from "@/components/codespace";
import { PanelLayoutContainer } from "@/components/panels";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useFileIndexStore } from "@/stores/fileIndexStore";
import { cn } from "@/lib/utils";
import type { Project, McpPermissionRequest } from "@/types";
import type { ImageAttachment as FileBrowserImageAttachment } from "@/components/files/FileBrowserPopup";
import { useSessionHandlers } from "./useSessionHandlers";
import { useToolApproval, createMcpHandlers } from "./useToolApproval";
import { MainContentHeader } from "./MainContentHeader";
import { MainContentBody } from "./MainContentBody";
import { MainContentModals } from "./MainContentModals";
import { SessionConflictPopup } from "./SessionConflictPopup";
import { claudeService } from "@/services/claude";

interface MainContentProps {
  project: Project;
  pendingImage?: FileBrowserImageAttachment | null;
  onImageConsumed?: () => void;
  onRequestImageBrowser?: () => void;
}

export function MainContent({ project, pendingImage, onImageConsumed, onRequestImageBrowser }: MainContentProps) {
  // Use direct store access pattern to avoid selector infinite loops
  const {
    activeSessionId,
    getSessionsForProject,
    getMessages,
    getStreamingState,
    getClaudeSessionState,
    clearMessages,
    clearContextStats,
  } = useSessionStore();
  const { toggleTerminal, getSessionPtyId, setSessionPtyId, getQueuedCommand, clearQueuedCommand } = useTerminalStore();
  const { useMultiPanelLayout, setUseMultiPanelLayout, sidebarCollapsed, sidebarPosition, installedProviders } = useSettingsStore();
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
  const terminalSessions = useMemo(() => sessions.filter((s) => s.type === "terminal"), [sessions]);

  const messages = currentSessionId ? getMessages(currentSessionId) : [];
  const streamingState = currentSessionId ? getStreamingState(currentSessionId) : null;
  const claudeSessionState = currentSessionId ? getClaudeSessionState(currentSessionId) : undefined;

  const pendingQuestionSet = streamingState?.pendingQuestionSet || null;
  const isSessionActive = claudeSessionState?.status === "ready";
  const isSessionStarting = claudeSessionState?.status === "starting";

  const [pendingMcpRequest, setPendingMcpRequest] = useState<McpPermissionRequest | null>(null);
  const [autoApprovedTools, setAutoApprovedTools] = useState<Set<string>>(new Set());
  const autoApprovedToolsRef = useRef<Set<string>>(new Set());
  const [sessionConflict, setSessionConflict] = useState<{ sessionId: string } | null>(null);
  const [isClosingConflict, setIsClosingConflict] = useState(false);

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
  const pendingApprovalTool = useMemo(() => {
    return allToolCalls.find(tc => tc.status === "pending") || null;
  }, [allToolCalls]);

  // Session handlers
  const {
    handleStartSession,
    handleStopSession,
    handleProviderChange,
    handleSendPrompt,
    handleSendStructuredPrompt,
    handleModeChange,
  } = useSessionHandlers({
    currentSessionId,
    projectPath: project.path,
    autoApprovedToolsRef,
    setPendingMcpRequest,
    onSessionConflict: useCallback((sessionId: string) => {
      setSessionConflict({ sessionId });
    }, []),
  });

  // Tool approval handlers
  const {
    handleApprove,
    handleReject,
    handleQuestionSubmit,
  } = useToolApproval({
    currentSessionId,
    setAutoApprovedTools,
    setPendingMcpRequest,
  });

  // MCP handlers (need access to pendingMcpRequest state)
  const { handleMcpApprove, handleMcpReject } = createMcpHandlers(
    pendingMcpRequest,
    setAutoApprovedTools,
    setPendingMcpRequest
  );

  const isStreaming = streamingState?.isStreaming || false;
  const isTerminalSession = currentSession?.type === "terminal";
  const isCodespaceSession = currentSession?.type === "codespace";

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

  const handleToggleTerminal = useCallback(() => {
    toggleTerminal(project.id);
  }, [toggleTerminal, project.id]);

  const handleTogglePanelLayout = useCallback(() => {
    setUseMultiPanelLayout(!useMultiPanelLayout);
  }, [setUseMultiPanelLayout, useMultiPanelLayout]);

  const handleClearContext = useCallback(() => {
    if (!currentSessionId) return;
    clearMessages(currentSessionId);
    clearContextStats(currentSessionId);
  }, [currentSessionId, clearMessages, clearContextStats]);

  const handleCloseConflictSession = useCallback(async () => {
    if (!sessionConflict) return;

    setIsClosingConflict(true);
    try {
      await claudeService.stopSession(sessionConflict.sessionId);
      setSessionConflict(null);
      // After closing, try to start the session again
      setTimeout(() => {
        handleStartSession();
      }, 100);
    } catch (error) {
      console.error("[MainContent] Failed to close conflicting session:", error);
    } finally {
      setIsClosingConflict(false);
    }
  }, [sessionConflict, handleStartSession]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
      <MainContentHeader
        projectPath={project.path}
        projectId={project.id}
        currentSession={currentSession}
        isSessionStarting={isSessionStarting}
        isSessionActive={isSessionActive}
        isTerminalSession={isTerminalSession}
        useMultiPanelLayout={useMultiPanelLayout}
        sidebarCollapsed={sidebarCollapsed}
        sidebarPosition={sidebarPosition}
        installedProviders={installedProviders}
        onStart={handleStartSession}
        onStop={handleStopSession}
        onProviderChange={handleProviderChange}
        onModeChange={handleModeChange}
        onToggleTerminal={handleToggleTerminal}
        onTogglePanelLayout={handleTogglePanelLayout}
        onClearContext={handleClearContext}
      />

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

      {/* Codespace Session */}
      {isCodespaceSession && currentSessionId && (
        <CodespaceEditor sessionId={currentSessionId} projectPath={project.path} />
      )}

      {/* Multi-panel layout mode */}
      {useMultiPanelLayout && !isTerminalSession && !isCodespaceSession && (
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
      {currentSessionId && !isTerminalSession && !isCodespaceSession && !useMultiPanelLayout && (
        <MainContentBody
          projectPath={project.path}
          sessionId={currentSession?.id}
          projectFiles={projectFiles}
          messages={messages}
          streamingState={streamingState}
          isStreaming={isStreaming}
          isSessionActive={isSessionActive}
          allToolCalls={allToolCalls}
          pendingImage={pendingImage}
          onImageConsumed={onImageConsumed}
          onRequestImageBrowser={onRequestImageBrowser}
          onSendPrompt={handleSendPrompt}
          onSendStructuredPrompt={handleSendStructuredPrompt}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {!isTerminalSession && !useMultiPanelLayout && (
        <TerminalPanel projectId={project.id} projectPath={project.path} />
      )}

      <ClaudePopup projectPath={project.path} />

      <MainContentModals
        pendingApprovalTool={pendingApprovalTool}
        pendingMcpRequest={pendingMcpRequest}
        pendingQuestionSet={pendingQuestionSet}
        onApprove={handleApprove}
        onReject={handleReject}
        onMcpApprove={handleMcpApprove}
        onMcpReject={handleMcpReject}
        onQuestionSubmit={handleQuestionSubmit}
      />

      <SessionConflictPopup
        isOpen={sessionConflict !== null}
        sessionId={sessionConflict?.sessionId || ""}
        onClose={() => setSessionConflict(null)}
        onCloseSession={handleCloseConflictSession}
        isClosing={isClosingConflict}
      />
    </div>
  );
}

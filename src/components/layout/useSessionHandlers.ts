import { useCallback } from "react";
import { claudeService } from "@/services/claude";
import { codexService } from "@/services/codex";
import { geminiService } from "@/services/gemini";
import { farmworkBridge } from "@/services/farmworkBridge";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { PermissionMode, AIProvider, StructuredPrompt, ImageAttachment, McpPermissionRequest } from "@/types";
import { v4 as uuid } from "uuid";

// In stream-json mode, there's no interactive tool approval.
// The CLI auto-approves or auto-rejects based on --permission-mode:
// - "default": File edits rejected, user sees permission_denials in result
// - "acceptEdits": File edits auto-approved, Bash still needs approval (rejected)
// - "bypassPermissions": Everything auto-approved
// GUI doesn't need to check permissions - CLI handles it
function toolNeedsPermission(_toolName: string, _permissionMode: PermissionMode): boolean {
  return false; // CLI handles permissions in stream-json mode
}

interface UseSessionHandlersProps {
  currentSessionId: string | undefined;
  projectPath: string;
  autoApprovedToolsRef: React.RefObject<Set<string>>;
  setPendingMcpRequest: React.Dispatch<React.SetStateAction<McpPermissionRequest | null>>;
}

export function useSessionHandlers({
  currentSessionId,
  projectPath,
  autoApprovedToolsRef,
  setPendingMcpRequest,
}: UseSessionHandlersProps) {
  const {
    getMessages,
    setClaudeSessionStarting,
    setClaudeSessionReady,
    setClaudeSessionEnded,
    appendStreamingText,
    appendThinkingText,
    setThinking,
    addPendingToolCall,
    appendToolInput,
    updateToolCallStatus,
    updateStats,
    finishStreaming,
    startStreaming,
    updateProviderSessionId,
    updateSessionProvider,
    updateSessionModel,
    getSession,
    setPendingQuestionSet,
    updateSessionPermissionMode,
    getClaudeSessionState,
  } = useSessionStore();
  const { claudeSafeMode, defaultModel, defaultCodexModel, defaultGeminiModel } = useSettingsStore();

  // Start a persistent AI session (Claude or Codex based on provider)
  const handleStartSession = useCallback(async () => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    const permissionMode = session?.permissionMode || "default";
    const provider = session?.provider || "claude";

    // Only resume if there are existing messages (true continuation)
    // Don't resume for fresh starts (no messages) - the old thread might be expired
    const existingMessages = getMessages(currentSessionId);
    const resumeSessionId = existingMessages.length > 0
      ? (session?.providerSessionId || undefined)
      : undefined;

    // Get the correct model based on provider
    const model = provider === "codex"
      ? defaultCodexModel
      : provider === "gemini"
        ? defaultGeminiModel
        : defaultModel;


    setClaudeSessionStarting(currentSessionId);

    // Common callbacks for both providers
    const commonCallbacks = {
      onSessionStarting: () => {
      },
      onSessionReady: (info: { model?: string; providerSessionId?: string }) => {
        setClaudeSessionReady(currentSessionId, info);
        if (info.providerSessionId) {
          updateProviderSessionId(currentSessionId, info.providerSessionId);
        }
      },
      onSessionEnded: (_reason: string) => {
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
      onUsage: (stats: Record<string, unknown>, isFinal?: boolean) => {
        updateStats(currentSessionId, stats, isFinal);
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
          projectPath,
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
          projectPath,
          currentSessionId,
          commonCallbacks,
          model,
          permissionMode,
          claudeSafeMode
        );
      } else {
        // Start Claude session (default)
        await claudeService.startSession(
          projectPath,
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
              // Check if this tool is auto-approved for this session
              if (autoApprovedToolsRef.current?.has(request.toolName)) {
                try {
                  await claudeService.respondToPermission(request.id, true);
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
    setPendingQuestionSet,
    claudeSafeMode,
    defaultModel,
    defaultCodexModel,
    defaultGeminiModel,
    autoApprovedToolsRef,
    getMessages,
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

    // Also update the model to the default for the new provider
    const newModel = provider === "codex"
      ? defaultCodexModel
      : provider === "gemini"
        ? defaultGeminiModel
        : defaultModel;
    updateSessionModel(currentSessionId, newModel);
  }, [currentSessionId, updateSessionProvider, updateSessionModel, defaultModel, defaultCodexModel, defaultGeminiModel]);

  // Send prompt to active session (Claude or Codex based on provider)
  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      if (!currentSessionId) return;

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
    [currentSessionId, getSession, startStreaming, appendStreamingText, finishStreaming]
  );

  // Send structured prompt with images/files to active session
  const handleSendStructuredPrompt = useCallback(
    async (prompt: StructuredPrompt) => {
      if (!currentSessionId) return;

      const session = getSession(currentSessionId);
      const provider = session?.provider || "claude";

      startStreaming(currentSessionId);

      try {
        if (provider === "codex") {
          // Convert StructuredPrompt images to ImageAttachment format for Codex
          const codexImages: ImageAttachment[] | undefined = prompt.images?.map((img, idx) => ({
            id: `img-${idx}`,
            data: img.base64.startsWith("data:") ? img.base64 : `data:${img.mediaType};base64,${img.base64}`,
            mimeType: img.mediaType,
          }));
          await codexService.sendStructuredPrompt(currentSessionId, prompt.text, codexImages);
        } else if (provider === "gemini") {
          // Convert StructuredPrompt images to ImageAttachment format for Gemini
          const geminiImages: ImageAttachment[] | undefined = prompt.images?.map((img, idx) => ({
            id: `img-${idx}`,
            data: img.base64.startsWith("data:") ? img.base64 : `data:${img.mediaType};base64,${img.base64}`,
            mimeType: img.mediaType,
          }));
          await geminiService.sendStructuredPrompt(currentSessionId, prompt.text, geminiImages);
        } else {
          // Claude accepts StructuredPrompt directly
          await claudeService.sendStructuredPrompt(currentSessionId, prompt);
        }
      } catch (error) {
        console.error("[MainContent] Failed to send structured prompt:", error);
        appendStreamingText(currentSessionId, `\nError: ${error}`);
        finishStreaming(currentSessionId);
      }
    },
    [currentSessionId, getSession, startStreaming, appendStreamingText, finishStreaming]
  );

  const handleModeChange = useCallback(async (mode: PermissionMode) => {
    if (!currentSessionId) return;

    const session = getSession(currentSessionId);
    const claudeSessionState = session ? getClaudeSessionState(currentSessionId) : undefined;
    const isActive = claudeSessionState?.status === "ready";

    // Update the mode in store
    updateSessionPermissionMode(currentSessionId, mode);

    // If session is active, we need to restart it for the new mode to take effect
    if (isActive) {
      try {
        // Stop current session
        await claudeService.stopSession(currentSessionId);
        setClaudeSessionEnded(currentSessionId);

        // Small delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Restart will happen automatically when user clicks Start again,
        // or we can auto-restart here. For now, just notify user.
      } catch (error) {
        console.error("[MainContent] Failed to restart session for mode change:", error);
      }
    }
  }, [currentSessionId, getSession, getClaudeSessionState, updateSessionPermissionMode, setClaudeSessionEnded]);

  return {
    handleStartSession,
    handleStopSession,
    handleProviderChange,
    handleSendPrompt,
    handleSendStructuredPrompt,
    handleModeChange,
  };
}

import { useCallback } from "react";
import { claudeService } from "@/services/claude";
import { useSessionStore } from "@/stores/sessionStore";
import type { McpPermissionRequest } from "@/types";

interface UseToolApprovalProps {
  currentSessionId: string | undefined;
  setAutoApprovedTools: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingMcpRequest: React.Dispatch<React.SetStateAction<McpPermissionRequest | null>>;
}

interface UseToolApprovalReturn {
  handleApprove: (toolId: string) => Promise<void>;
  handleReject: (toolId: string) => Promise<void>;
  handleQuestionSubmit: (answers: Record<string, string[]>) => Promise<void>;
}

export function useToolApproval({
  currentSessionId,
}: UseToolApprovalProps): UseToolApprovalReturn {
  const {
    updateToolCallStatus,
    setPendingQuestionSet,
    getStreamingState,
  } = useSessionStore();

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

  // Handle question submission - format answers as JSON and send to Claude stdin
  const handleQuestionSubmit = useCallback(
    async (answers: Record<string, string[]>) => {
      if (!currentSessionId) return;

      const streamingState = getStreamingState(currentSessionId);
      const pendingQuestionSet = streamingState?.pendingQuestionSet;
      if (!pendingQuestionSet) return;

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
    [currentSessionId, getStreamingState, setPendingQuestionSet]
  );

  return {
    handleApprove,
    handleReject,
    handleQuestionSubmit,
  };
}

// Separate handlers for MCP permissions that need access to pendingMcpRequest state
export function createMcpHandlers(
  pendingMcpRequest: McpPermissionRequest | null,
  setAutoApprovedTools: React.Dispatch<React.SetStateAction<Set<string>>>,
  setPendingMcpRequest: React.Dispatch<React.SetStateAction<McpPermissionRequest | null>>
) {
  const handleMcpApprove = async (alwaysAllow?: boolean) => {
    if (!pendingMcpRequest) return;

    // If "always allow" was checked, add this tool to auto-approved set
    if (alwaysAllow && pendingMcpRequest.toolName) {
      setAutoApprovedTools(prev => new Set([...prev, pendingMcpRequest.toolName]));
    }

    try {
      await claudeService.respondToPermission(pendingMcpRequest.id, true);
      setPendingMcpRequest(null);
    } catch (error) {
      console.error("[MainContent] Failed to approve MCP permission:", error);
    }
  };

  const handleMcpReject = async () => {
    if (!pendingMcpRequest) return;
    try {
      await claudeService.respondToPermission(pendingMcpRequest.id, false);
      setPendingMcpRequest(null);
    } catch (error) {
      console.error("Failed to reject MCP permission:", error);
    }
  };

  return {
    handleMcpApprove,
    handleMcpReject,
  };
}

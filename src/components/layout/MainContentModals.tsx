import { PermissionApprovalModal } from "@/components/output/PermissionApprovalModal";
import { AskUserQuestionModal } from "@/components/output/AskUserQuestionModal";
import type { ToolCall, McpPermissionRequest } from "@/types";
import type { PendingQuestionSet } from "@/components/output/AskUserQuestionBlock";

interface MainContentModalsProps {
  pendingApprovalTool: ToolCall | null;
  pendingMcpRequest: McpPermissionRequest | null;
  pendingQuestionSet: PendingQuestionSet | null;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
  onMcpApprove: (alwaysAllow?: boolean) => Promise<void>;
  onMcpReject: () => Promise<void>;
  onQuestionSubmit: (answers: Record<string, string[]>) => Promise<void>;
}

export function MainContentModals({
  pendingApprovalTool,
  pendingMcpRequest,
  pendingQuestionSet,
  onApprove,
  onReject,
  onMcpApprove,
  onMcpReject,
  onQuestionSubmit,
}: MainContentModalsProps) {
  return (
    <>
      {/* Permission approval modal - blocks UI until user approves/rejects */}
      {pendingApprovalTool && (
        <PermissionApprovalModal
          toolCall={pendingApprovalTool}
          onApprove={() => onApprove(pendingApprovalTool.id)}
          onReject={() => onReject(pendingApprovalTool.id)}
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
          onApprove={onMcpApprove}
          onReject={onMcpReject}
        />
      )}

      {/* AskUserQuestion modal - for Claude plan mode questions */}
      {pendingQuestionSet && (
        <AskUserQuestionModal
          questionSet={pendingQuestionSet}
          onSubmit={onQuestionSubmit}
        />
      )}
    </>
  );
}

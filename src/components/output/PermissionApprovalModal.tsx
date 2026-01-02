import { useState, useMemo } from "react";
import { AlertTriangle, Check, X, Terminal, FileEdit, Globe } from "lucide-react";
import { Button, Checkbox } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/types";

interface PermissionApprovalModalProps {
  toolCall: ToolCall;
  onApprove: (alwaysAllow?: boolean) => void;
  onReject: () => void;
}

function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("bash") || name.includes("shell") || name.includes("exec")) {
    return Terminal;
  }
  if (name.includes("edit") || name.includes("write")) {
    return FileEdit;
  }
  if (name.includes("web") || name.includes("fetch")) {
    return Globe;
  }
  return Terminal;
}

function getToolRiskLevel(toolName: string): "high" | "medium" | "low" {
  const name = toolName.toLowerCase();
  if (name.includes("bash") || name.includes("shell") || name.includes("exec")) {
    return "high";
  }
  if (name.includes("edit") || name.includes("write") || name.includes("delete")) {
    return "medium";
  }
  return "low";
}

function formatToolInput(input: Record<string, unknown>): string {
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.path) return String(input.path);
  if (input.url) return String(input.url);

  if (input.raw && typeof input.raw === "string") {
    try {
      const parsed = JSON.parse(input.raw);
      return formatToolInput(parsed);
    } catch (error) {
      return input.raw.slice(0, 200);
    }
  }

  const keys = Object.keys(input);
  if (keys.length === 0) return "No parameters";
  if (keys.length === 1) {
    const val = input[keys[0]];
    if (typeof val === "string") return val.slice(0, 200);
  }

  return JSON.stringify(input, null, 2).slice(0, 500);
}

export function PermissionApprovalModal({
  toolCall,
  onApprove,
  onReject,
}: PermissionApprovalModalProps) {
  const [alwaysAllow, setAlwaysAllow] = useState(false);
  const Icon = getToolIcon(toolCall.name);
  const riskLevel = getToolRiskLevel(toolCall.name);
  const inputPreview = useMemo(
    () => formatToolInput(toolCall.input),
    [toolCall.input]
  );

  const handleApprove = () => {
    onApprove(alwaysAllow);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - blocks interaction */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg mx-4",
          "bg-bg-primary border-2 rounded-lg shadow-2xl",
          "overflow-hidden",
          riskLevel === "high" && "border-accent-red",
          riskLevel === "medium" && "border-accent-yellow",
          riskLevel === "low" && "border-accent"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            riskLevel === "high" && "bg-accent-red/10",
            riskLevel === "medium" && "bg-accent-yellow/10",
            riskLevel === "low" && "bg-accent/10"
          )}
        >
          <AlertTriangle
            className={cn(
              "w-5 h-5",
              riskLevel === "high" && "text-accent-red",
              riskLevel === "medium" && "text-accent-yellow",
              riskLevel === "low" && "text-accent"
            )}
          />
          <div>
            <h3 className="font-semibold text-text-primary">Permission Required</h3>
            <p className="text-xs text-text-secondary">Claude wants to use a tool</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Tool info */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary border border-border">
            <Icon
              className={cn(
                "w-5 h-5 mt-0.5",
                riskLevel === "high" && "text-accent-red",
                riskLevel === "medium" && "text-accent-yellow",
                riskLevel === "low" && "text-accent"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium text-text-primary">
                {toolCall.name}
              </div>
              <pre className="mt-2 text-xs text-text-secondary font-mono whitespace-pre-wrap break-all max-h-40 overflow-auto">
                {inputPreview}
              </pre>
            </div>
          </div>

          {/* Risk warning for high-risk tools */}
          {riskLevel === "high" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent-red/5 border border-accent-red/20">
              <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent-red">
                This tool can execute commands on your system. Review carefully before approving.
              </p>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        <div className="px-4 py-3 border-t border-border bg-bg-secondary space-y-3">
          {/* Always allow checkbox */}
          <Checkbox
            checked={alwaysAllow}
            onChange={(e) => setAlwaysAllow(e.target.checked)}
            label={`Always allow ${toolCall.name} for this session`}
            className="text-xs"
          />

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReject}
              className="text-accent-red hover:text-accent-red hover:bg-accent-red/10"
            >
              <X className="w-4 h-4 mr-1.5" />
              Deny
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApprove}
              className="bg-accent-green hover:bg-accent-green/90"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Allow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

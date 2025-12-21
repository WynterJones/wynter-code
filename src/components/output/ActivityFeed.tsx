import { useRef, useEffect } from "react";
import {
  Terminal,
  FileEdit,
  Search,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ScrollArea, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/types";

interface ActivityFeedProps {
  toolCalls: ToolCall[];
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("bash") || name.includes("shell") || name.includes("exec")) {
    return <Terminal className="w-4 h-4" />;
  }
  if (name.includes("edit") || name.includes("write") || name.includes("file")) {
    return <FileEdit className="w-4 h-4" />;
  }
  if (name.includes("search") || name.includes("grep") || name.includes("find")) {
    return <Search className="w-4 h-4" />;
  }
  if (name.includes("read") || name.includes("glob") || name.includes("list")) {
    return <FolderOpen className="w-4 h-4" />;
  }
  return <Terminal className="w-4 h-4" />;
}

function getStatusIcon(status: ToolCall["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-accent-green" />;
    case "error":
      return <XCircle className="w-4 h-4 text-accent-red" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    case "pending":
      return <AlertCircle className="w-4 h-4 text-accent-yellow" />;
    default:
      return null;
  }
}

function getStatusColor(status: ToolCall["status"]) {
  switch (status) {
    case "completed":
      return "border-accent-green/30 bg-accent-green/5";
    case "error":
      return "border-accent-red/30 bg-accent-red/5";
    case "running":
      return "border-accent/30 bg-accent/5";
    case "pending":
      return "border-accent-yellow/30 bg-accent-yellow/5";
    default:
      return "border-border";
  }
}

function formatToolInput(input: Record<string, unknown>): string {
  if (input.raw && typeof input.raw === "string") {
    try {
      const parsed = JSON.parse(input.raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return input.raw;
    }
  }
  return JSON.stringify(input, null, 2);
}

interface ActivityItemProps {
  toolCall: ToolCall;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function ActivityItem({ toolCall, onApprove, onReject }: ActivityItemProps) {
  const isPending = toolCall.status === "pending";
  const isRunning = toolCall.status === "running";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-200",
        getStatusColor(toolCall.status)
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-text-secondary">
          {getToolIcon(toolCall.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-text-primary font-medium truncate">
              {toolCall.name}
            </span>
            {getStatusIcon(toolCall.status)}
          </div>

          {Object.keys(toolCall.input).length > 0 && (
            <pre className="text-xs text-text-secondary font-mono bg-bg-secondary rounded p-2 overflow-x-auto max-h-24">
              {formatToolInput(toolCall.input)}
            </pre>
          )}

          {toolCall.output && (
            <div className="mt-2 text-xs text-text-secondary font-mono bg-bg-secondary rounded p-2 overflow-x-auto max-h-24">
              {toolCall.output.slice(0, 500)}
              {toolCall.output.length > 500 && "..."}
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onApprove(toolCall.id)}
                className="text-xs"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReject(toolCall.id)}
                className="text-xs text-accent-red hover:text-accent-red"
              >
                Reject
              </Button>
            </div>
          )}

          {isRunning && (
            <div className="flex items-center gap-2 mt-2 text-xs text-accent">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Executing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ toolCalls, onApprove, onReject }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [toolCalls]);

  if (toolCalls.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Tool activity will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {toolCalls.map((toolCall) => (
          <ActivityItem
            key={toolCall.id}
            toolCall={toolCall}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

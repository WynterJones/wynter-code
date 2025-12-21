import {
  Terminal,
  FileText,
  Search,
  Edit3,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  GitBranch,
  Database,
  Code,
  List,
} from "lucide-react";
import type { ToolCall } from "@/types";
import { cn } from "@/lib/utils";

interface ToolCallBlockProps {
  toolCall: ToolCall;
  onApprove?: (toolId: string) => void;
  onReject?: (toolId: string) => void;
}

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Bash: Terminal,
  Read: FileText,
  Write: Edit3,
  Edit: Edit3,
  Grep: Search,
  Glob: FolderOpen,
  Task: List,
  WebFetch: Globe,
  WebSearch: Globe,
  GitStatus: GitBranch,
  TodoWrite: List,
  NotebookEdit: Code,
  sql: Database,
};

const toolColors: Record<string, string> = {
  Bash: "text-accent-yellow",
  Read: "text-accent-green",
  Write: "text-accent",
  Edit: "text-accent",
  Grep: "text-accent-blue",
  Glob: "text-accent-orange",
  Task: "text-accent-cyan",
  WebFetch: "text-accent-blue",
  WebSearch: "text-accent-blue",
  TodoWrite: "text-accent-cyan",
};

function formatInput(input: Record<string, unknown>): string {
  // Try to extract meaningful info from the input
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.path) return String(input.path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  if (input.url) return String(input.url);
  if (input.prompt) return String(input.prompt).slice(0, 50) + "...";
  if (input.content) return String(input.content).slice(0, 50) + "...";
  if (input.description) return String(input.description);

  // For raw string input
  if (input.raw) return String(input.raw).slice(0, 60);

  // Fallback to JSON but make it compact
  const keys = Object.keys(input);
  if (keys.length === 0) return "";
  if (keys.length === 1) {
    const val = input[keys[0]];
    if (typeof val === "string") return val.slice(0, 60);
  }

  return "";
}

export function ToolCallBlock({
  toolCall,
}: ToolCallBlockProps) {
  const Icon = toolIcons[toolCall.name] || Terminal;
  const iconColor = toolColors[toolCall.name] || "text-text-secondary";

  const isRunning = toolCall.status === "running";
  const isCompleted = toolCall.status === "completed";
  const isError = toolCall.status === "error";
  const isPending = toolCall.status === "pending";

  const inputStr = formatInput(toolCall.input);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "bg-bg-tertiary/50 border",
        isRunning && "border-accent/30",
        isCompleted && "border-accent-green/30",
        isError && "border-accent-red/30",
        isPending && "border-accent-yellow/30"
      )}
    >
      {/* Icon */}
      <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />

      {/* Tool name */}
      <span className="font-mono text-sm font-medium text-text-primary">
        {toolCall.name}
      </span>

      {/* Input summary */}
      {inputStr && (
        <>
          <span className="text-text-secondary/50">·</span>
          <span className="text-xs text-text-secondary font-mono truncate max-w-[300px]">
            {inputStr}
          </span>
        </>
      )}

      {/* Status indicator - pushed to right */}
      <div className="ml-auto flex items-center gap-1.5">
        {isRunning && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
          </>
        )}
        {isCompleted && (
          <CheckCircle className="w-3.5 h-3.5 text-accent-green" />
        )}
        {isError && (
          <XCircle className="w-3.5 h-3.5 text-accent-red" />
        )}
        {isPending && (
          <span className="text-xs text-accent-yellow">Pending</span>
        )}
      </div>
    </div>
  );
}

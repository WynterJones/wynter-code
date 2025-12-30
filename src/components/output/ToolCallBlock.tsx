import { useState } from "react";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ToolCall } from "@/types";
import { cn } from "@/lib/utils";
import { EditToolInput } from "./tools";
import hljs from "highlight.js";

interface ToolCallBlockProps {
  toolCall: ToolCall;
  defaultExpanded?: boolean;
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

function formatInputSummary(input: Record<string, unknown>): string {
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.path) return String(input.path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  if (input.url) return String(input.url);
  if (input.prompt) return String(input.prompt).slice(0, 50) + "...";
  if (input.content) return String(input.content).slice(0, 50) + "...";
  if (input.description) return String(input.description);
  if (input.raw) return String(input.raw).slice(0, 60);

  const keys = Object.keys(input);
  if (keys.length === 0) return "";
  if (keys.length === 1) {
    const val = input[keys[0]];
    if (typeof val === "string") return val.slice(0, 60);
  }

  return "";
}

function highlightBash(code: string): string {
  try {
    return hljs.highlight(code, { language: "bash" }).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

function ToolInputDetail({
  toolName,
  input,
}: {
  toolName: string;
  input: Record<string, unknown>;
}) {
  switch (toolName) {
    case "Edit":
      return (
        <EditToolInput
          input={input as { file_path?: string; old_string?: string; new_string?: string }}
        />
      );

    case "Bash":
      return (
        <div className="rounded-lg overflow-hidden bg-bg-tertiary border border-border">
          <div className="px-3 py-1.5 bg-bg-hover border-b border-border">
            <span className="text-xs text-text-secondary font-mono">bash</span>
          </div>
          <pre
            className="p-3 text-xs font-mono overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: highlightBash(String(input.command || "")),
            }}
          />
        </div>
      );

    case "Read":
    case "Write":
      return (
        <div className="rounded-lg bg-bg-tertiary border border-border px-3 py-2">
          <span className="text-xs text-text-secondary">Path: </span>
          <span className="text-xs font-mono text-text-primary">
            {String(input.file_path || input.path || "")}
          </span>
        </div>
      );

    case "Grep": {
      const grepPath = input.path ? String(input.path) : null;
      return (
        <div className="rounded-lg bg-bg-tertiary border border-border px-3 py-2 space-y-1">
          <div>
            <span className="text-xs text-text-secondary">Pattern: </span>
            <code className="text-xs font-mono text-accent-cyan bg-bg-hover px-1 rounded">
              {String(input.pattern || "")}
            </code>
          </div>
          {grepPath && (
            <div>
              <span className="text-xs text-text-secondary">Path: </span>
              <span className="text-xs font-mono text-text-primary">
                {grepPath}
              </span>
            </div>
          )}
        </div>
      );
    }

    case "Glob": {
      const globPath = input.path ? String(input.path) : null;
      return (
        <div className="rounded-lg bg-bg-tertiary border border-border px-3 py-2 space-y-1">
          <div>
            <span className="text-xs text-text-secondary">Pattern: </span>
            <code className="text-xs font-mono text-accent-orange bg-bg-hover px-1 rounded">
              {String(input.pattern || "")}
            </code>
          </div>
          {globPath && (
            <div>
              <span className="text-xs text-text-secondary">Path: </span>
              <span className="text-xs font-mono text-text-primary">
                {globPath}
              </span>
            </div>
          )}
        </div>
      );
    }

    case "WebFetch":
    case "WebSearch": {
      const webUrl = input.url ? String(input.url) : null;
      const webQuery = input.query ? String(input.query) : null;
      return (
        <div className="rounded-lg bg-bg-tertiary border border-border px-3 py-2 space-y-1">
          {webUrl && (
            <div>
              <span className="text-xs text-text-secondary">URL: </span>
              <span className="text-xs font-mono text-accent-blue">
                {webUrl}
              </span>
            </div>
          )}
          {webQuery && (
            <div>
              <span className="text-xs text-text-secondary">Query: </span>
              <span className="text-xs text-text-primary">
                {webQuery}
              </span>
            </div>
          )}
        </div>
      );
    }

    default:
      // Fallback to JSON display
      return (
        <div className="rounded-lg overflow-hidden bg-bg-tertiary border border-border">
          <div className="px-3 py-1.5 bg-bg-hover border-b border-border">
            <span className="text-xs text-text-secondary font-mono">json</span>
          </div>
          <pre className="p-3 text-xs font-mono overflow-x-auto text-text-secondary">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      );
  }
}

export function ToolCallBlock({
  toolCall,
  defaultExpanded = false,
}: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const Icon = toolIcons[toolCall.name] || Terminal;
  const iconColor = toolColors[toolCall.name] || "text-text-secondary";

  const isRunning = toolCall.status === "running";
  const isCompleted = toolCall.status === "completed";
  const isError = toolCall.status === "error";
  const isPending = toolCall.status === "pending";

  const inputStr = formatInputSummary(toolCall.input);
  const hasDetailedInput = Object.keys(toolCall.input).length > 0;

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden",
        "bg-bg-tertiary/50 border",
        isRunning && "border-accent/30",
        isCompleted && "border-accent-green/30",
        isError && "border-accent-red/30",
        isPending && "border-accent-yellow/30"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => hasDetailedInput && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2",
          hasDetailedInput && "cursor-pointer hover:bg-bg-hover/50 transition-colors"
        )}
        disabled={!hasDetailedInput}
      >
        {/* Expand chevron */}
        {hasDetailedInput && (
          <span className="text-text-secondary">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}

        {/* Icon */}
        <Icon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />

        {/* Tool name */}
        <span className="font-mono text-sm font-medium text-text-primary">
          {toolCall.name}
        </span>

        {/* Input summary - when collapsed */}
        {!isExpanded && inputStr && (
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
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle className="w-3.5 h-3.5 text-accent-green" />
          )}
          {isError && <XCircle className="w-3.5 h-3.5 text-accent-red" />}
          {isPending && (
            <span className="text-xs text-accent-yellow">Pending</span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && hasDetailedInput && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <ToolInputDetail toolName={toolCall.name} input={toolCall.input} />

          {/* Tool output if available */}
          {toolCall.output && (
            <div className="mt-2">
              <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wide">
                Output
              </div>
              <div
                className={cn(
                  "rounded-lg bg-bg-secondary border px-3 py-2 text-xs font-mono overflow-x-auto max-h-40",
                  isError ? "border-accent-red/30" : "border-border"
                )}
              >
                <pre className="whitespace-pre-wrap break-words text-text-secondary">
                  {toolCall.output.slice(0, 500)}
                  {toolCall.output.length > 500 && "..."}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

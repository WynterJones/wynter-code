import { useRef, useEffect, useState, useMemo, memo } from "react";
import {
  Terminal,
  FileEdit,
  Search,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  List,
  Code,
  FileText,
  Bot,
  Compass,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { ScrollArea, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/types";
import {
  EditToolInput,
  GrepToolDisplay,
  ReadToolDisplay,
  BashToolDisplay,
  GlobToolDisplay,
  TodoWriteDisplay,
} from "./tools";

// Subagent type detection and metadata
interface SubagentInfo {
  isSubagent: boolean;
  subagentType?: string;
  displayName?: string;
  icon?: typeof Bot;
}

function getSubagentInfo(toolCall: ToolCall): SubagentInfo {
  const name = toolCall.name.toLowerCase();

  // Check if it's a Task tool (subagent invocation)
  if (name === "task") {
    // Extract subagent_type from input
    const input = toolCall.input;
    const subagentType = (input.subagent_type as string) || (input.subagent as string) || "";

    // Map subagent types to display names and icons
    const subagentMap: Record<string, { name: string; icon: typeof Bot }> = {
      "explore": { name: "Explore", icon: Compass },
      "plan": { name: "Plan", icon: ClipboardList },
      "general-purpose": { name: "General", icon: Bot },
      "code-reviewer": { name: "Code Reviewer", icon: BookOpen },
      "code-cleanup-agent": { name: "Code Cleanup", icon: Sparkles },
      "security-auditor": { name: "Security Auditor", icon: ShieldCheck },
      "performance-auditor": { name: "Performance Auditor", icon: Sparkles },
      "accessibility-auditor": { name: "A11y Auditor", icon: ShieldCheck },
      "code-smell-auditor": { name: "Code Quality", icon: BookOpen },
      "tauri-security-auditor": { name: "Tauri Security", icon: ShieldCheck },
      "rust-code-auditor": { name: "Rust Auditor", icon: BookOpen },
      "unused-code-cleaner": { name: "Unused Code Cleaner", icon: Sparkles },
      "idea-gardener": { name: "Idea Gardener", icon: Sparkles },
      "the-farmer": { name: "The Farmer", icon: Bot },
      "storybook-maintainer": { name: "Storybook", icon: BookOpen },
      "test-scaffolder": { name: "Test Scaffolder", icon: ClipboardList },
      "file-decomposer": { name: "File Decomposer", icon: Sparkles },
      "i18n-locale-translator": { name: "i18n Translator", icon: Globe },
      "claude-code-guide": { name: "Claude Guide", icon: BookOpen },
    };

    const normalizedType = subagentType.toLowerCase();
    const mapping = subagentMap[normalizedType];

    return {
      isSubagent: true,
      subagentType: subagentType,
      displayName: mapping?.name || subagentType || "Subagent",
      icon: mapping?.icon || Bot,
    };
  }

  return { isSubagent: false };
}

interface ActivityFeedProps {
  toolCalls: ToolCall[];
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes("bash") || name.includes("shell") || name.includes("exec")) {
    return Terminal;
  }
  if (name.includes("edit") || name.includes("write")) {
    return FileEdit;
  }
  if (name.includes("search") || name.includes("grep")) {
    return Search;
  }
  if (name.includes("read")) {
    return FileText;
  }
  if (name.includes("glob") || name.includes("list")) {
    return FolderOpen;
  }
  if (name.includes("web") || name.includes("fetch")) {
    return Globe;
  }
  if (name.includes("todo") || name.includes("task")) {
    return List;
  }
  if (name.includes("notebook") || name.includes("code")) {
    return Code;
  }
  return Terminal;
}

function getToolColor(toolName: string): string {
  const name = toolName.toLowerCase();
  if (name.includes("bash") || name.includes("shell")) return "text-accent-yellow";
  if (name.includes("edit") || name.includes("write")) return "text-accent";
  if (name.includes("read")) return "text-accent-green";
  if (name.includes("search") || name.includes("grep")) return "text-accent-blue";
  if (name.includes("glob")) return "text-accent-orange";
  if (name.includes("web")) return "text-accent-cyan";
  if (name.includes("todo") || name.includes("task")) return "text-accent-cyan";
  return "text-text-secondary";
}

function formatToolSummary(input: Record<string, unknown>): string {
  // Extract the most relevant piece of info for display
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.path) return String(input.path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  if (input.url) return String(input.url);
  if (input.prompt) return String(input.prompt);
  if (input.content) return String(input.content);
  if (input.description) return String(input.description);
  if (input.raw && typeof input.raw === "string") {
    try {
      const parsed = JSON.parse(input.raw);
      return formatToolSummary(parsed);
    } catch (error) {
      return input.raw.slice(0, 100);
    }
  }

  const keys = Object.keys(input);
  if (keys.length === 1) {
    const val = input[keys[0]];
    if (typeof val === "string") return val;
  }

  return "";
}

function formatToolInput(input: Record<string, unknown>): string {
  if (input.raw && typeof input.raw === "string") {
    try {
      const parsed = JSON.parse(input.raw);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return input.raw;
    }
  }
  return JSON.stringify(input, null, 2);
}

interface TaskToolDisplayProps {
  input: {
    description?: string;
    prompt?: string;
    subagent_type?: string;
    model?: string;
    run_in_background?: boolean;
  };
  output?: string;
  subagentInfo: SubagentInfo;
}

function TaskToolDisplay({ input, output, subagentInfo }: TaskToolDisplayProps) {
  const AgentIcon = subagentInfo.icon || Bot;
  const modelLabel = input.model ? input.model.charAt(0).toUpperCase() + input.model.slice(1) : null;

  return (
    <div className="space-y-2">
      {/* Agent info header */}
      <div className="rounded-lg bg-accent-purple/5 border border-accent-purple/20 overflow-hidden">
        <div className="px-2 py-1.5 bg-accent-purple/10 border-b border-accent-purple/20 flex items-center gap-2">
          <AgentIcon className="w-3 h-3 text-accent-purple" />
          <span className="text-[10px] text-accent-purple font-medium">
            {subagentInfo.displayName}
          </span>
          {modelLabel && (
            <span className="ml-auto px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide bg-bg-tertiary text-text-secondary rounded">
              {modelLabel}
            </span>
          )}
          {input.run_in_background && (
            <span className="px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide bg-accent-yellow/20 text-accent-yellow rounded">
              Background
            </span>
          )}
        </div>

        {/* Description */}
        {input.description && (
          <div className="px-2 py-1.5 border-b border-accent-purple/10">
            <span className="text-[10px] font-medium text-text-primary">
              {input.description}
            </span>
          </div>
        )}

        {/* Prompt (truncated) */}
        {input.prompt && (
          <div className="px-2 py-1.5">
            <p className="text-[9px] text-text-secondary font-mono line-clamp-4">
              {input.prompt}
            </p>
          </div>
        )}
      </div>

      {/* Agent output */}
      {output && (
        <div className="rounded-lg bg-[#1a1a1a] border border-border overflow-hidden">
          <div className="px-2 py-1 bg-bg-hover border-b border-border">
            <span className="text-[9px] text-text-secondary">Agent Output</span>
          </div>
          <div className="max-h-48 overflow-auto p-2">
            <pre className="text-[10px] font-mono text-[#b0b0b0] whitespace-pre-wrap break-all">
              {output.slice(0, 2000)}
              {output.length > 2000 && "..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CompactActivityItemProps {
  toolCall: ToolCall;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

export const CompactActivityItem = memo(function CompactActivityItem({ toolCall, onApprove, onReject }: CompactActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isPending = toolCall.status === "pending";
  const isRunning = toolCall.status === "running";
  const isCompleted = toolCall.status === "completed";
  const isError = toolCall.status === "error";

  // Check if this is a subagent call
  const subagentInfo = getSubagentInfo(toolCall);

  // Use subagent icon if applicable, otherwise regular tool icon
  const Icon = subagentInfo.isSubagent && subagentInfo.icon
    ? subagentInfo.icon
    : getToolIcon(toolCall.name);
  const iconColor = subagentInfo.isSubagent
    ? "text-accent-purple"
    : getToolColor(toolCall.name);

  // Memoize JSON operations to avoid recalculation on re-render
  const summary = useMemo(
    () => formatToolSummary(toolCall.input),
    [toolCall.input]
  );
  const formattedInput = useMemo(
    () => formatToolInput(toolCall.input),
    [toolCall.input]
  );
  const hasDetails = Object.keys(toolCall.input).length > 0 || toolCall.output;

  return (
    <div
      className={cn(
        "rounded border transition-all duration-150",
        subagentInfo.isSubagent && isRunning && "border-accent-purple/40 bg-accent-purple/5",
        subagentInfo.isSubagent && isCompleted && "border-accent-purple/30 bg-transparent",
        !subagentInfo.isSubagent && isRunning && "border-accent/40 bg-accent/5",
        !subagentInfo.isSubagent && isCompleted && "border-border/50 bg-transparent",
        isError && "border-accent-red/40 bg-accent-red/5",
        isPending && "border-accent-yellow/40 bg-accent-yellow/5"
      )}
    >
      {/* Compact header row */}
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 text-left",
          hasDetails && "hover:bg-bg-hover/50 cursor-pointer",
          !hasDetails && "cursor-default"
        )}
      >
        {/* Expand indicator */}
        {hasDetails ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 text-text-secondary/50 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-text-secondary/50 flex-shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}

        {/* Tool icon */}
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", iconColor)} />

        {/* Tool name + Subagent badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-mono text-xs font-medium text-text-primary">
            {subagentInfo.isSubagent ? subagentInfo.displayName : toolCall.name}
          </span>
          {subagentInfo.isSubagent && (
            <span className="px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide bg-accent-purple/20 text-accent-purple rounded">
              Agent
            </span>
          )}
        </div>

        {/* Summary (truncated) - for subagents, show the description from prompt */}
        {subagentInfo.isSubagent ? (
          <span className="text-[10px] text-text-secondary/70 font-mono truncate flex-1 min-w-0">
            {(toolCall.input.description as string) || (toolCall.input.prompt as string)?.slice(0, 50) || ""}
          </span>
        ) : summary && (
          <span className="text-[10px] text-text-secondary/70 font-mono truncate flex-1 min-w-0">
            {summary}
          </span>
        )}

        {/* Status icon - right side */}
        <div className="flex-shrink-0 ml-auto">
          {isRunning && (
            <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle className="w-3.5 h-3.5 text-accent-green" />
          )}
          {isError && (
            <XCircle className="w-3.5 h-3.5 text-accent-red" />
          )}
          {isPending && (
            <AlertCircle className="w-3.5 h-3.5 text-accent-yellow" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 border-t border-border/30">
          {/* Tool-specific rendering */}
          {toolCall.name === "Edit" && toolCall.input.old_string !== undefined ? (
            <EditToolInput
              input={toolCall.input as { file_path?: string; old_string?: string; new_string?: string }}
            />
          ) : toolCall.name === "Grep" ? (
            <GrepToolDisplay
              input={toolCall.input as { pattern?: string; path?: string; output_mode?: string; glob?: string }}
              output={toolCall.output}
            />
          ) : toolCall.name === "Read" ? (
            <ReadToolDisplay
              input={toolCall.input as { file_path?: string; offset?: number; limit?: number }}
              output={toolCall.output}
            />
          ) : toolCall.name === "Bash" ? (
            <BashToolDisplay
              input={toolCall.input as { command?: string; description?: string; timeout?: number }}
              output={toolCall.output}
            />
          ) : toolCall.name === "Glob" ? (
            <GlobToolDisplay
              input={toolCall.input as { pattern?: string; path?: string }}
              output={toolCall.output}
            />
          ) : toolCall.name === "TodoWrite" ? (
            <TodoWriteDisplay
              input={toolCall.input as { todos?: Array<{ content: string; status: "pending" | "in_progress" | "completed"; activeForm?: string }> }}
              output={toolCall.output}
            />
          ) : subagentInfo.isSubagent ? (
            <TaskToolDisplay
              input={toolCall.input as { description?: string; prompt?: string; subagent_type?: string; model?: string; run_in_background?: boolean }}
              output={toolCall.output}
              subagentInfo={subagentInfo}
            />
          ) : (
            <>
              {Object.keys(toolCall.input).length > 0 && (
                <pre className="text-[10px] text-text-secondary font-mono bg-bg-secondary/50 rounded p-1.5 overflow-x-auto max-h-32 mb-1">
                  {formattedInput}
                </pre>
              )}
              {toolCall.output && (
                <div className="mt-1.5 text-[10px] text-text-secondary font-mono bg-bg-secondary/50 rounded p-1.5 overflow-x-auto max-h-32">
                  {toolCall.output.slice(0, 500)}
                  {toolCall.output.length > 500 && "..."}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pending approval buttons */}
      {isPending && (
        <div className="flex gap-1.5 px-2 pb-2">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onApprove(toolCall.id);
            }}
            className="text-[10px] h-6 px-2"
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onReject(toolCall.id);
            }}
            className="text-[10px] h-6 px-2 text-accent-red hover:text-accent-red"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
});

export const ActivityFeed = memo(function ActivityFeed({ toolCalls, onApprove, onReject }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [toolCalls]);

  if (toolCalls.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Terminal className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <p className="text-[10px]">Tool activity will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-1.5">
        {toolCalls.map((toolCall) => (
          <CompactActivityItem
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
});

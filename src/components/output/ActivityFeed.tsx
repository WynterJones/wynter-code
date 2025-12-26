import { useRef, useEffect, useState } from "react";
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
    } catch {
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
    } catch {
      return input.raw;
    }
  }
  return JSON.stringify(input, null, 2);
}

interface CompactActivityItemProps {
  toolCall: ToolCall;
  onApprove: (toolId: string) => void;
  onReject: (toolId: string) => void;
}

function CompactActivityItem({ toolCall, onApprove, onReject }: CompactActivityItemProps) {
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

  const summary = formatToolSummary(toolCall.input);
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
          {Object.keys(toolCall.input).length > 0 && (
            <pre className="text-[10px] text-text-secondary font-mono bg-bg-secondary/50 rounded p-1.5 overflow-x-auto max-h-32 mb-1">
              {formatToolInput(toolCall.input)}
            </pre>
          )}

          {toolCall.output && (
            <div className="text-[10px] text-text-secondary font-mono bg-bg-secondary/50 rounded p-1.5 overflow-x-auto max-h-32">
              {toolCall.output.slice(0, 500)}
              {toolCall.output.length > 500 && "..."}
            </div>
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
}

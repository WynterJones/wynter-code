import { X, GripVertical, Bug, Sparkles, CheckSquare } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { cn } from "@/lib/utils";
import type { BeadsIssue, BeadsIssueType } from "@/types/beads";
import { PRIORITY_COLORS } from "@/types/beads";

interface AutoBuildIssueCardProps {
  issue: BeadsIssue;
  isActive: boolean;
  columnId: string;
}

const TYPE_ICONS: Record<BeadsIssueType, React.ReactNode> = {
  task: <CheckSquare className="h-3 w-3" />,
  feature: <Sparkles className="h-3 w-3" />,
  bug: <Bug className="h-3 w-3" />,
  epic: <Sparkles className="h-3 w-3" />,
};

const TYPE_COLORS: Record<BeadsIssueType, string> = {
  task: "bg-blue-500/20 text-blue-400",
  feature: "bg-green-500/20 text-green-400",
  bug: "bg-red-500/20 text-red-400",
  epic: "bg-purple-500/20 text-purple-400",
};

export function AutoBuildIssueCard({ issue, isActive, columnId }: AutoBuildIssueCardProps) {
  const { removeFromQueue, progress, currentPhase } = useAutoBuildStore();

  const canRemove = columnId === "backlog";
  const showProgress = isActive && (columnId === "doing" || columnId === "testing");

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-bg-primary p-3 transition-all",
        isActive
          ? "border-accent shadow-md shadow-accent/10"
          : "border-border hover:border-text-secondary"
      )}
    >
      {/* Drag handle for backlog */}
      {columnId === "backlog" && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-50">
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Remove button for backlog */}
      {canRemove && (
        <button
          onClick={() => removeFromQueue(issue.id)}
          className="absolute -right-1 -top-1 hidden rounded-full bg-bg-secondary p-0.5 text-text-secondary transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:block"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Type badge */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
            TYPE_COLORS[issue.issue_type]
          )}
        >
          {TYPE_ICONS[issue.issue_type]}
          {issue.issue_type}
        </span>
        <span className={cn("text-xs", PRIORITY_COLORS[issue.priority])}>
          P{issue.priority}
        </span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-medium">{issue.title}</h3>

      {/* Issue ID */}
      <div className="mt-2 text-xs text-text-secondary">{issue.id}</div>

      {/* Progress bar for active issues */}
      {showProgress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
            <span>
              {currentPhase === "working" && "Working..."}
              {currentPhase === "testing" && "Testing..."}
              {currentPhase === "committing" && "Committing..."}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                currentPhase === "committing" ? "bg-green-500" : "bg-accent"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Active indicator pulse */}
      {isActive && (
        <div className="absolute -right-0.5 -top-0.5 h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </div>
      )}
    </div>
  );
}

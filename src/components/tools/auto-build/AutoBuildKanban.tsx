import { useMemo } from "react";
import { Plus, Inbox, Loader2, FlaskConical, CheckCircle2 } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { AutoBuildIssueCard } from "./AutoBuildIssueCard";
import { cn } from "@/lib/utils";
import type { BeadsIssue } from "@/types/beads";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

interface AutoBuildKanbanProps {
  issues: BeadsIssue[];
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: BeadsIssue[];
  emptyMessage: string;
}

export function AutoBuildKanban({ issues }: AutoBuildKanbanProps) {
  const { queue, completed, currentIssueId, currentPhase, addToQueue, getCachedIssue } = useAutoBuildStore();

  // Build columns
  const columns = useMemo<KanbanColumn[]>(() => {
    // Backlog: Issues in queue (not current)
    const backlogIssues = queue
      .filter((id) => id !== currentIssueId)
      .map((id) => issues.find((i) => i.id === id) || getCachedIssue(id))
      .filter((i): i is BeadsIssue => !!i);

    // Doing: Current issue in working phase
    const doingIssues =
      currentIssueId && currentPhase === "working"
        ? [issues.find((i) => i.id === currentIssueId) || getCachedIssue(currentIssueId)].filter(
            (i): i is BeadsIssue => !!i
          )
        : [];

    // Testing: Current issue in testing/committing phase
    const testingIssues =
      currentIssueId && (currentPhase === "testing" || currentPhase === "committing")
        ? [issues.find((i) => i.id === currentIssueId) || getCachedIssue(currentIssueId)].filter(
            (i): i is BeadsIssue => !!i
          )
        : [];

    // Completed: Recently completed issues
    const completedIssues = completed
      .map((id) => issues.find((i) => i.id === id) || getCachedIssue(id))
      .filter((i): i is BeadsIssue => !!i);

    return [
      {
        id: "backlog",
        title: "Backlog",
        icon: <Inbox className="h-4 w-4" />,
        color: "bg-blue-500",
        items: backlogIssues,
        emptyMessage: "Add issues to queue",
      },
      {
        id: "doing",
        title: "Doing",
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        color: "bg-amber-500",
        items: doingIssues,
        emptyMessage: "No active work",
      },
      {
        id: "testing",
        title: "Testing",
        icon: <FlaskConical className="h-4 w-4" />,
        color: "bg-purple-500",
        items: testingIssues,
        emptyMessage: "No tests running",
      },
      {
        id: "completed",
        title: "Completed",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "bg-green-500",
        items: completedIssues,
        emptyMessage: "No completions yet",
      },
    ];
  }, [queue, completed, currentIssueId, currentPhase, issues, getCachedIssue]);

  // Available issues that can be added to queue (open, not epic, not already in queue)
  const availableIssues = useMemo(() => {
    return issues.filter(
      (i) =>
        i.status === "open" &&
        i.issue_type !== "epic" &&
        !queue.includes(i.id) &&
        !completed.includes(i.id)
    );
  }, [issues, queue, completed]);

  return (
    <div className="flex h-full gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex w-1/4 min-w-[200px] flex-col rounded-lg border border-border bg-bg-secondary"
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <div className={cn("rounded p-1", column.color + "/20")}>
              <span className={column.color.replace("bg-", "text-")}>{column.icon}</span>
            </div>
            <span className="font-medium">{column.title}</span>
            <span className="ml-auto text-sm text-text-secondary">{column.items.length}</span>
          </div>

          {/* Column Content */}
          <OverlayScrollbarsComponent
            className="flex-1"
            options={{ scrollbars: { autoHide: "scroll" } }}
          >
            <div className="flex flex-col gap-2 p-2">
              {column.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-text-secondary">
                  <span>{column.emptyMessage}</span>
                </div>
              ) : (
                column.items.map((issue) => (
                  <AutoBuildIssueCard
                    key={issue.id}
                    issue={issue}
                    isActive={issue.id === currentIssueId}
                    columnId={column.id}
                  />
                ))
              )}

              {/* Add button for backlog column */}
              {column.id === "backlog" && availableIssues.length > 0 && (
                <AddIssueDropdown issues={availableIssues} onAdd={addToQueue} />
              )}
            </div>
          </OverlayScrollbarsComponent>
        </div>
      ))}
    </div>
  );
}

interface AddIssueDropdownProps {
  issues: BeadsIssue[];
  onAdd: (id: string) => void;
}

function AddIssueDropdown({ issues, onAdd }: AddIssueDropdownProps) {
  return (
    <div className="group relative">
      <button className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-2 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent">
        <Plus className="h-3.5 w-3.5" />
        Add Issue
      </button>

      {/* Dropdown */}
      <div className="absolute left-0 right-0 top-full z-10 mt-1 hidden max-h-48 overflow-auto rounded-lg border border-border bg-bg-primary shadow-lg group-hover:block">
        {issues.slice(0, 10).map((issue) => (
          <button
            key={issue.id}
            onClick={() => onAdd(issue.id)}
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-secondary"
          >
            <span className="shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
              {issue.issue_type}
            </span>
            <span className="line-clamp-1">{issue.title}</span>
          </button>
        ))}
        {issues.length > 10 && (
          <div className="px-3 py-2 text-xs text-text-secondary">
            +{issues.length - 10} more issues available
          </div>
        )}
      </div>
    </div>
  );
}

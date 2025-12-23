import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import type { BeadsIssue } from "@/types/beads";
import {
  STATUS_COLORS,
  TYPE_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/types/beads";

interface Epic {
  epic: BeadsIssue;
  children: BeadsIssue[];
  progress: {
    total: number;
    closed: number;
    percentage: number;
  };
}

export function EpicsTab() {
  const { issues } = useBeadsStore();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  const epics = useMemo(() => {
    const epicIssues = issues.filter((i) => i.issue_type === "epic");
    const epicMap: Epic[] = [];

    for (const epic of epicIssues) {
      // Find children by matching ID prefix (e.g., epic-id.1, epic-id.2)
      const children = issues.filter(
        (i) =>
          i.id !== epic.id &&
          i.id.startsWith(epic.id + ".") &&
          !i.id.substring(epic.id.length + 1).includes(".")
      );

      const closedCount = children.filter((c) => c.status === "closed").length;
      epicMap.push({
        epic,
        children,
        progress: {
          total: children.length,
          closed: closedCount,
          percentage: children.length > 0 ? (closedCount / children.length) * 100 : 0,
        },
      });
    }

    return epicMap;
  }, [issues]);

  const toggleExpanded = (epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <OverlayScrollbarsComponent
        className="flex-1 os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        {epics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            No epics found
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {epics.map(({ epic, children, progress }) => {
              const isExpanded = expandedEpics.has(epic.id);

              return (
                <div
                  key={epic.id}
                  className="rounded-lg border border-border bg-bg-tertiary/30 overflow-hidden"
                >
                  {/* Epic Header */}
                  <button
                    onClick={() => toggleExpanded(epic.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-bg-tertiary/50 transition-colors"
                  >
                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                      )}
                    </div>

                    {/* Epic Badge */}
                    <span
                      className={cn(
                        "flex-shrink-0 px-2 py-0.5 text-xs rounded border",
                        TYPE_COLORS.epic
                      )}
                    >
                      Epic
                    </span>

                    {/* Title */}
                    <span className="flex-1 text-left text-sm font-medium text-text-primary truncate">
                      {epic.title}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                        STATUS_COLORS[epic.status]
                      )}
                    >
                      {epic.status.replace("_", " ")}
                    </span>

                    {/* Progress Bar */}
                    <div className="flex-shrink-0 w-32 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary w-12 text-right">
                        {progress.closed}/{progress.total}
                      </span>
                    </div>
                  </button>

                  {/* Children */}
                  {isExpanded && children.length > 0 && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-bg-tertiary/30 transition-colors"
                        >
                          {/* Type Badge */}
                          <span
                            className={cn(
                              "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                              TYPE_COLORS[child.issue_type]
                            )}
                          >
                            {child.issue_type}
                          </span>

                          {/* Title */}
                          <span className="flex-1 text-sm text-text-primary truncate">
                            {child.title}
                          </span>

                          {/* Status */}
                          <span
                            className={cn(
                              "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                              STATUS_COLORS[child.status]
                            )}
                          >
                            {child.status.replace("_", " ")}
                          </span>

                          {/* Priority */}
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <Zap
                              className={cn("w-3 h-3", PRIORITY_COLORS[child.priority])}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                PRIORITY_COLORS[child.priority]
                              )}
                            >
                              {PRIORITY_LABELS[child.priority]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No children message */}
                  {isExpanded && children.length === 0 && (
                    <div className="border-t border-border/50 px-4 py-3 pl-12 text-sm text-text-secondary">
                      No child issues
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </OverlayScrollbarsComponent>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary">
        {epics.length} epic{epics.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

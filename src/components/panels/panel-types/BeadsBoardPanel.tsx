import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { CircleDot, Zap } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import type { PanelContentProps } from "@/types/panel";
import type { BeadsIssue, BeadsStatus } from "@/types/beads";
import { TYPE_COLORS, PRIORITY_COLORS } from "@/types/beads";

const BOARD_COLUMNS: { id: BeadsStatus; label: string; color: string }[] = [
  { id: "blocked", label: "Blocked", color: "border-red-500/50" },
  { id: "open", label: "Open", color: "border-green-500/50" },
  { id: "in_progress", label: "In Progress", color: "border-amber-500/50" },
  { id: "closed", label: "Closed", color: "border-neutral-500/50" },
];

interface ReadOnlyIssueCardProps {
  issue: BeadsIssue;
}

function ReadOnlyIssueCard({ issue }: ReadOnlyIssueCardProps) {
  return (
    <div className="p-2.5 rounded-lg border border-border bg-bg-secondary">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className={cn(
            "px-1 py-0.5 text-[9px] rounded border capitalize",
            TYPE_COLORS[issue.issue_type]
          )}
        >
          {issue.issue_type}
        </span>
        <div className="flex items-center gap-0.5">
          <Zap className={cn("w-2.5 h-2.5", PRIORITY_COLORS[issue.priority])} />
        </div>
      </div>

      <p className="text-xs font-medium text-text-primary line-clamp-2">
        {issue.title}
      </p>

      <p className="mt-1.5 text-[9px] font-mono text-text-secondary">
        #{issue.id.split("-").pop()}
      </p>
    </div>
  );
}

interface ReadOnlyColumnProps {
  column: (typeof BOARD_COLUMNS)[number];
  issues: BeadsIssue[];
}

function ReadOnlyColumn({ column, issues }: ReadOnlyColumnProps) {
  return (
    <div className="flex flex-col min-h-0 flex-1 min-w-[200px]">
      <div
        className={cn(
          "flex items-center justify-between px-2.5 py-1.5 border-t-2 rounded-t-lg bg-bg-tertiary/30",
          column.color
        )}
      >
        <span className="text-xs font-medium text-text-primary">{column.label}</span>
        <span className="text-[10px] text-text-secondary bg-bg-tertiary px-1 py-0.5 rounded">
          {issues.length}
        </span>
      </div>

      <OverlayScrollbarsComponent
        className="flex-1 bg-bg-tertiary/10 rounded-b-lg border border-t-0 border-border"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        <div className="p-1.5 space-y-1.5 min-h-[120px]">
          {issues.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[100px] text-[10px] text-text-secondary">
              No issues
            </div>
          ) : (
            issues.map((issue) => (
              <ReadOnlyIssueCard key={issue.id} issue={issue} />
            ))
          )}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}

export function BeadsBoardPanel({ projectPath }: PanelContentProps) {
  const { issues, setProjectPath, fetchIssues, fetchStats, stats } = useBeadsStore();
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  useEffect(() => {
    if (projectPath) {
      setProjectPath(projectPath);
      fetchIssues();
      fetchStats();
    }
  }, [projectPath, setProjectPath, fetchIssues, fetchStats]);

  const columnIssues = useMemo(() => {
    const result: Record<BeadsStatus, BeadsIssue[]> = {
      blocked: [],
      open: [],
      in_progress: [],
      closed: [],
    };

    for (const issue of issues) {
      if (result[issue.status]) {
        result[issue.status].push(issue);
      }
    }

    return result;
  }, [issues]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const osInstance = scrollRef.current?.osInstance();
    const viewport = osInstance?.elements().viewport;
    if (!viewport) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      scrollLeft: viewport.scrollLeft,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const osInstance = scrollRef.current?.osInstance();
    const viewport = osInstance?.elements().viewport;
    if (!viewport) return;

    const dx = e.clientX - dragStartRef.current.x;
    viewport.scrollLeft = dragStartRef.current.scrollLeft - dx;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-secondary/50">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Issues Board</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
            {stats?.blocked ?? columnIssues.blocked.length}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
            {stats?.open ?? columnIssues.open.length}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            {stats?.in_progress ?? columnIssues.in_progress.length}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-500/20 text-neutral-400">
            {stats?.closed ?? columnIssues.closed.length}
          </span>
        </div>
      </div>

      <OverlayScrollbarsComponent
        ref={scrollRef}
        className={cn("flex-1", isDragging && "cursor-grabbing")}
        options={{
          scrollbars: { theme: "os-theme-custom", autoHide: "scroll" },
          overflow: { x: "scroll", y: "hidden" },
        }}
      >
        <div
          className={cn(
            "flex gap-3 p-3 h-full min-w-max",
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {BOARD_COLUMNS.map((column) => (
            <ReadOnlyColumn
              key={column.id}
              column={column}
              issues={columnIssues[column.id]}
            />
          ))}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}

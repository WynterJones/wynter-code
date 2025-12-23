import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Zap } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import type { BeadsIssue, BeadsStatus } from "@/types/beads";
import { TYPE_COLORS, PRIORITY_COLORS } from "@/types/beads";

const BOARD_COLUMNS: { id: BeadsStatus; label: string; color: string }[] = [
  { id: "blocked", label: "Blocked", color: "border-red-500/50" },
  { id: "open", label: "Ready", color: "border-green-500/50" },
  { id: "in_progress", label: "In Progress", color: "border-amber-500/50" },
  { id: "closed", label: "Closed", color: "border-neutral-500/50" },
];

interface IssueCardProps {
  issue: BeadsIssue;
  isDragging?: boolean;
}

function IssueCard({ issue, isDragging }: IssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isCardDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-3 rounded-lg border border-border bg-bg-secondary cursor-grab active:cursor-grabbing transition-colors",
        "hover:border-border-hover hover:bg-bg-tertiary/50",
        (isCardDragging || isDragging) && "opacity-50 shadow-lg"
      )}
    >
      {/* Type + Priority */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] rounded border capitalize",
            TYPE_COLORS[issue.issue_type]
          )}
        >
          {issue.issue_type}
        </span>
        <div className="flex items-center gap-0.5">
          <Zap className={cn("w-3 h-3", PRIORITY_COLORS[issue.priority])} />
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-text-primary line-clamp-2">{issue.title}</p>

      {/* ID */}
      <p className="mt-2 text-[10px] font-mono text-text-secondary">
        #{issue.id.split("-").pop()}
      </p>
    </div>
  );
}

function DragOverlayCard({ issue }: { issue: BeadsIssue }) {
  return (
    <div className="p-3 rounded-lg border border-accent bg-bg-secondary shadow-xl cursor-grabbing">
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] rounded border capitalize",
            TYPE_COLORS[issue.issue_type]
          )}
        >
          {issue.issue_type}
        </span>
        <div className="flex items-center gap-0.5">
          <Zap className={cn("w-3 h-3", PRIORITY_COLORS[issue.priority])} />
        </div>
      </div>
      <p className="text-sm text-text-primary line-clamp-2">{issue.title}</p>
      <p className="mt-2 text-[10px] font-mono text-text-secondary">
        #{issue.id.split("-").pop()}
      </p>
    </div>
  );
}

interface BoardColumnProps {
  column: (typeof BOARD_COLUMNS)[number];
  issues: BeadsIssue[];
}

function BoardColumn({ column, issues }: BoardColumnProps) {
  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-t-2 rounded-t-lg bg-bg-tertiary/30",
          column.color
        )}
      >
        <span className="text-sm font-medium text-text-primary">{column.label}</span>
        <span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
          {issues.length}
        </span>
      </div>

      {/* Column Content */}
      <OverlayScrollbarsComponent
        className="flex-1 bg-bg-tertiary/10 rounded-b-lg border border-t-0 border-border os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-2 min-h-[200px]">
            {issues.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-text-secondary">
                No issues
              </div>
            ) : (
              issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
            )}
          </div>
        </SortableContext>
      </OverlayScrollbarsComponent>
    </div>
  );
}

export function BoardTab() {
  const { issues, updateIssue, closeIssue } = useBeadsStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [pendingClose, setPendingClose] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnIssues = useMemo(() => {
    const result: Record<BeadsStatus, BeadsIssue[]> = {
      blocked: [],
      open: [],
      in_progress: [],
      closed: [],
    };

    // Filter out epic issues and group by status
    for (const issue of issues) {
      if (issue.issue_type === "epic") continue;
      if (result[issue.status]) {
        result[issue.status].push(issue);
      }
    }

    return result;
  }, [issues]);

  const activeIssue = useMemo(() => {
    if (!activeId) return null;
    return issues.find((i) => i.id === activeId) || null;
  }, [activeId, issues]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const issueId = active.id as string;
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) return;

    // Determine target column from drop location
    let targetStatus: BeadsStatus | null = null;

    // Check if dropped on another card
    const targetIssue = issues.find((i) => i.id === over.id);
    if (targetIssue) {
      targetStatus = targetIssue.status;
    } else {
      // Check if dropped on a column
      const column = BOARD_COLUMNS.find((c) => c.id === over.id);
      if (column) {
        targetStatus = column.id;
      }
    }

    if (!targetStatus || targetStatus === issue.status) return;

    // Handle closing specially - need a reason
    if (targetStatus === "closed") {
      setPendingClose(issueId);
      return;
    }

    try {
      await updateIssue(issueId, { status: targetStatus });
    } catch (err) {
      console.error("Failed to update issue status:", err);
    }
  };

  const handleCloseWithReason = async () => {
    if (!pendingClose || !closeReason.trim()) return;

    try {
      await closeIssue(pendingClose, closeReason);
      setPendingClose(null);
      setCloseReason("");
    } catch (err) {
      console.error("Failed to close issue:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Close Reason Modal */}
      {pendingClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 w-80">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              Close Issue
            </h3>
            <input
              type="text"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Enter close reason..."
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCloseWithReason();
                if (e.key === "Escape") {
                  setPendingClose(null);
                  setCloseReason("");
                }
              }}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setPendingClose(null);
                  setCloseReason("");
                }}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWithReason}
                disabled={!closeReason.trim()}
                className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Close Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              issues={columnIssues[column.id]}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? <DragOverlayCard issue={activeIssue} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

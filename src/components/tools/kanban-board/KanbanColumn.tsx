import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, CheckSquare } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import { KanbanCard, LockedKanbanCard } from "./KanbanCard";
import type { KanbanTask, KanbanColumn as KanbanColumnType } from "@/types/kanban";

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: KanbanTask[];
  isDraggingOver?: boolean;
  onAddTask?: () => void;
  onEditTask?: (task: KanbanTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleLock?: (taskId: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  isDraggingOver = false,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleLock,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // Use either isOver (direct column hover) or isDraggingOver (hovering over cards in this column)
  const showDropIndicator = isOver || isDraggingOver;

  const isPolishedColumn = column.id === "polished";

  // Separate locked and unlocked tasks (only for polished column)
  const { unlockedTasks, lockedTasks } = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    if (!isPolishedColumn) {
      return { unlockedTasks: sorted, lockedTasks: [] };
    }
    return {
      unlockedTasks: sorted.filter((t) => !t.locked),
      lockedTasks: sorted.filter((t) => t.locked),
    };
  }, [tasks, isPolishedColumn]);

  const taskIds = useMemo(() => unlockedTasks.map((t) => t.id), [unlockedTasks]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-0 flex-1 min-w-[280px] rounded-lg transition-all duration-150",
        showDropIndicator && "ring-2 ring-accent bg-accent/10 shadow-[inset_0_4px_16px_0_rgba(203,166,247,0.2)]"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-t-2 rounded-t-lg bg-bg-tertiary/30",
          column.color
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {column.title}
          </span>
          <span className="text-xs text-text-secondary bg-bg-tertiary px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
          {lockedTasks.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
              <CheckSquare className="w-2.5 h-2.5" />
              {lockedTasks.length}
            </span>
          )}
        </div>

        {column.id === "backlog" && onAddTask && (
          <Tooltip content="Add Task">
            <IconButton size="sm" onClick={onAddTask} aria-label="Add task to backlog">
              <Plus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Column Content */}
      <div
        className={cn(
          "flex-1 flex flex-col rounded-b-lg border border-t-0 overflow-hidden transition-all duration-150",
          showDropIndicator
            ? "bg-accent/5 border-accent/30"
            : "bg-bg-tertiary/10 border-border"
        )}
      >
        <OverlayScrollbarsComponent
          className={cn("flex-1", lockedTasks.length > 0 && "min-h-0")}
          options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className={cn(
              "p-2 space-y-2 min-h-[280px] transition-all duration-150",
              showDropIndicator && "bg-gradient-to-b from-accent/5 to-transparent"
            )}>
              {unlockedTasks.length === 0 && lockedTasks.length === 0 ? (
                <div className={cn(
                  "flex items-center justify-center h-full min-h-[240px] text-xs rounded-lg border-2 border-dashed transition-all duration-150",
                  showDropIndicator
                    ? "border-accent/50 bg-accent/5 text-accent"
                    : "border-transparent text-text-secondary"
                )}>
                  {showDropIndicator ? "Drop here" : column.emptyMessage}
                </div>
              ) : unlockedTasks.length === 0 ? (
                <div className={cn(
                  "flex items-center justify-center h-20 text-xs rounded-lg border-2 border-dashed transition-all duration-150",
                  showDropIndicator
                    ? "border-accent/50 bg-accent/5 text-accent"
                    : "border-transparent text-text-secondary"
                )}>
                  {showDropIndicator ? "Drop here" : "All tasks locked"}
                </div>
              ) : (
                <>
                  {unlockedTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onToggleLock={onToggleLock}
                      showLockToggle={isPolishedColumn}
                    />
                  ))}
                  {/* Drop zone indicator at bottom of cards */}
                  {showDropIndicator && (
                    <div className="flex items-center justify-center h-16 text-xs text-accent rounded-lg border-2 border-dashed border-accent/50 bg-accent/5 mt-2">
                      Drop here
                    </div>
                  )}
                </>
              )}
            </div>
          </SortableContext>
        </OverlayScrollbarsComponent>

        {/* Locked Tasks Section (Polished column only) */}
        {lockedTasks.length > 0 && (
          <div className="shrink-0 border-t border-border/50 bg-bg-tertiary/20">
            <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-border/30">
              <CheckSquare className="w-3 h-3 text-green-400/70" />
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wide">
                Completed ({lockedTasks.length})
              </span>
            </div>
            <OverlayScrollbarsComponent
              className="max-h-[180px]"
              options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
            >
              <div className="p-2 space-y-1.5">
                {lockedTasks.map((task) => (
                  <LockedKanbanCard
                    key={task.id}
                    task={task}
                    onToggleLock={onToggleLock}
                  />
                ))}
              </div>
            </OverlayScrollbarsComponent>
          </div>
        )}
      </div>
    </div>
  );
}

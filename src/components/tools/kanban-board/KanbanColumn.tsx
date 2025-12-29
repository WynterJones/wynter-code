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
  onAddTask?: () => void;
  onEditTask?: (task: KanbanTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onToggleLock?: (taskId: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleLock,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

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
        "flex flex-col min-h-0 flex-1 min-w-[280px]",
        isOver && "ring-2 ring-accent/50 rounded-lg"
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
            <IconButton size="sm" onClick={onAddTask}>
              <Plus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Column Content */}
      <div className="flex-1 flex flex-col bg-bg-tertiary/10 rounded-b-lg border border-t-0 border-border overflow-hidden">
        <OverlayScrollbarsComponent
          className={cn("flex-1", lockedTasks.length > 0 && "min-h-0")}
          options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-2 min-h-[200px]">
              {unlockedTasks.length === 0 && lockedTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-text-secondary">
                  {column.emptyMessage}
                </div>
              ) : unlockedTasks.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-text-secondary">
                  All tasks locked
                </div>
              ) : (
                unlockedTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onToggleLock={onToggleLock}
                    showLockToggle={isPolishedColumn}
                  />
                ))
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

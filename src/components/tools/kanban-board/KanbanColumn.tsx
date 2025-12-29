import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import { KanbanCard } from "./KanbanCard";
import type { KanbanTask, KanbanColumn as KanbanColumnType } from "@/types/kanban";

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: KanbanTask[];
  onAddTask?: () => void;
  onEditTask?: (task: KanbanTask) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.order - b.order);
  }, [tasks]);

  const taskIds = useMemo(() => sortedTasks.map((t) => t.id), [sortedTasks]);

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
      <OverlayScrollbarsComponent
        className="flex-1 bg-bg-tertiary/10 rounded-b-lg border border-t-0 border-border os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="p-2 space-y-2 min-h-[200px]">
            {sortedTasks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-text-secondary">
                {column.emptyMessage}
              </div>
            ) : (
              sortedTasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </div>
        </SortableContext>
      </OverlayScrollbarsComponent>
    </div>
  );
}

import { useMemo, useRef, useState, useCallback } from "react";
import { CheckSquare } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useKanbanStore } from "@/stores/kanbanStore";
import type { PanelContentProps } from "@/types/panel";
import type { KanbanTask, KanbanStatus, KanbanColumn as KanbanColumnType } from "@/types/kanban";
import { KANBAN_COLUMNS, PRIORITY_COLORS, PRIORITY_DOT_COLORS } from "@/types/kanban";

interface ReadOnlyCardProps {
  task: KanbanTask;
  isLocked?: boolean;
}

function ReadOnlyCard({ task, isLocked }: ReadOnlyCardProps) {
  if (isLocked) {
    return (
      <div className="px-2.5 py-1.5 rounded bg-bg-tertiary/30 border border-border/30">
        <p className="text-xs text-text-tertiary line-clamp-1">{task.title}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-2.5 rounded-lg border-l-4 bg-bg-secondary border border-border",
        PRIORITY_COLORS[task.priority]
      )}
    >
      <p className="text-xs font-medium text-text-primary line-clamp-2">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 text-[10px] text-text-secondary line-clamp-1">
          {task.description}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT_COLORS[task.priority])}
        />
        <span className="text-[9px] text-text-tertiary font-medium">P{task.priority}</span>
      </div>
    </div>
  );
}

interface ReadOnlyColumnProps {
  column: KanbanColumnType;
  tasks: KanbanTask[];
}

function ReadOnlyColumn({ column, tasks }: ReadOnlyColumnProps) {
  const isPolishedColumn = column.id === "polished";

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

  return (
    <div className="flex flex-col min-h-0 flex-1 min-w-[200px]">
      <div
        className={cn(
          "flex items-center justify-between px-2.5 py-1.5 border-t-2 rounded-t-lg bg-bg-tertiary/30",
          column.color
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary">{column.title}</span>
          <span className="text-[10px] text-text-secondary bg-bg-tertiary px-1 py-0.5 rounded">
            {tasks.length}
          </span>
          {lockedTasks.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-green-400 bg-green-500/10 px-1 py-0.5 rounded">
              <CheckSquare className="w-2 h-2" />
              {lockedTasks.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col rounded-b-lg border border-t-0 border-border bg-bg-tertiary/10 overflow-hidden">
        <OverlayScrollbarsComponent
          className={cn("flex-1", lockedTasks.length > 0 && "min-h-0")}
          options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
        >
          <div className="p-1.5 space-y-1.5 min-h-[120px]">
            {unlockedTasks.length === 0 && lockedTasks.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[100px] text-[10px] text-text-secondary">
                {column.emptyMessage}
              </div>
            ) : unlockedTasks.length === 0 ? (
              <div className="flex items-center justify-center h-12 text-[10px] text-text-secondary">
                All tasks locked
              </div>
            ) : (
              unlockedTasks.map((task) => (
                <ReadOnlyCard key={task.id} task={task} />
              ))
            )}
          </div>
        </OverlayScrollbarsComponent>

        {lockedTasks.length > 0 && (
          <div className="shrink-0 border-t border-border/50 bg-bg-tertiary/20">
            <div className="px-2 py-1 flex items-center gap-1 border-b border-border/30">
              <CheckSquare className="w-2 h-2 text-green-400/70" />
              <span className="text-[9px] text-text-tertiary font-medium uppercase tracking-wide">
                Done ({lockedTasks.length})
              </span>
            </div>
            <OverlayScrollbarsComponent
              className="max-h-[100px]"
              options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
            >
              <div className="p-1.5 space-y-1">
                {lockedTasks.map((task) => (
                  <ReadOnlyCard key={task.id} task={task} isLocked />
                ))}
              </div>
            </OverlayScrollbarsComponent>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoardPanel({ projectId }: PanelContentProps) {
  const { getBoard } = useKanbanStore();
  const board = getBoard(projectId);
  const scrollRef = useRef<OverlayScrollbarsComponentRef>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  const columnTasks = useMemo(() => {
    const result: Record<KanbanStatus, KanbanTask[]> = {
      backlog: [],
      doing: [],
      mvp: [],
      polished: [],
    };

    for (const task of board.tasks) {
      if (result[task.status]) {
        result[task.status].push(task);
      }
    }

    return result;
  }, [board.tasks]);

  const stats = useMemo(() => ({
    total: board.tasks.length,
    backlog: columnTasks.backlog.length,
    doing: columnTasks.doing.length,
    mvp: columnTasks.mvp.length,
    polished: columnTasks.polished.length,
  }), [board.tasks.length, columnTasks]);

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
          <CheckSquare className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">Workspace Board</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {stats.backlog}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            {stats.doing}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
            {stats.mvp}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            {stats.polished}
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
          {KANBAN_COLUMNS.map((column) => (
            <ReadOnlyColumn
              key={column.id}
              column={column}
              tasks={columnTasks[column.id]}
            />
          ))}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
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
import { CheckSquare, X, Plus } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { useKanbanStore } from "@/stores/kanbanStore";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCardPreview } from "./KanbanCard";
import { KanbanNewTaskPopup } from "./KanbanNewTaskPopup";
import type { KanbanTask, KanbanStatus, KanbanPriority } from "@/types/kanban";
import { KANBAN_COLUMNS, KANBAN_STATUSES } from "@/types/kanban";

interface KanbanBoardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function KanbanBoardPopup({
  isOpen,
  onClose,
  workspaceId,
}: KanbanBoardPopupProps) {
  const [showNewTaskPopup, setShowNewTaskPopup] = useState(false);
  const [editTask, setEditTask] = useState<KanbanTask | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    getBoard,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useKanbanStore();

  const board = getBoard(workspaceId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

    // Sort each column by order
    for (const status of KANBAN_STATUSES) {
      result[status].sort((a, b) => a.order - b.order);
    }

    return result;
  }, [board.tasks]);

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    return board.tasks.find((t) => t.id === activeId) || null;
  }, [activeId, board.tasks]);

  const stats = useMemo(() => {
    return {
      total: board.tasks.length,
      backlog: columnTasks.backlog.length,
      doing: columnTasks.doing.length,
      mvp: columnTasks.mvp.length,
      polished: columnTasks.polished.length,
    };
  }, [board.tasks.length, columnTasks]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showNewTaskPopup || editTask) {
          setShowNewTaskPopup(false);
          setEditTask(null);
        } else {
          onClose();
        }
      }
      // Ctrl/Cmd + N to add new task
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowNewTaskPopup(true);
      }
    },
    [onClose, showNewTaskPopup, editTask]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target status from drop location
    let targetStatus: KanbanStatus | null = null;

    // Check if dropped on another task
    const targetTask = board.tasks.find((t) => t.id === over.id);
    if (targetTask) {
      targetStatus = targetTask.status;
    } else {
      // Check if dropped on a column
      const column = KANBAN_COLUMNS.find((c) => c.id === over.id);
      if (column) {
        targetStatus = column.id;
      }
    }

    if (!targetStatus || targetStatus === task.status) return;

    moveTask(workspaceId, taskId, targetStatus);
  };

  const handleCreateTask = (
    title: string,
    priority: KanbanPriority,
    description?: string
  ) => {
    createTask(workspaceId, title, priority, description);
  };

  const handleUpdateTask = (
    taskId: string,
    title: string,
    priority: KanbanPriority,
    description?: string
  ) => {
    updateTask(workspaceId, taskId, { title, priority, description });
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditTask(task);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(workspaceId, taskId);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Popup Container */}
        <div
          className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-150"
          style={{
            width: "calc(100vw - 60px)",
            height: "calc(100vh - 60px)",
            maxWidth: "1600px",
            maxHeight: "900px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-14 shrink-0 px-4 border-b border-border bg-bg-secondary">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                Workspace Board
              </h2>
              <div className="flex items-center gap-2 ml-4 text-xs text-text-secondary">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {stats.backlog} backlog
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  {stats.doing} doing
                </span>
                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  {stats.mvp} MVP
                </span>
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  {stats.polished} polished
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="New Task (Ctrl+N)">
                <IconButton size="sm" onClick={() => setShowNewTaskPopup(true)}>
                  <Plus className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip content="Close">
                <IconButton size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

          {/* Board Content */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks[column.id]}
                  onAddTask={
                    column.id === "backlog"
                      ? () => setShowNewTaskPopup(true)
                      : undefined
                  }
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* New/Edit Task Modal */}
      <KanbanNewTaskPopup
        isOpen={showNewTaskPopup || !!editTask}
        onClose={() => {
          setShowNewTaskPopup(false);
          setEditTask(null);
        }}
        onSubmit={handleCreateTask}
        editTask={editTask}
        onUpdate={handleUpdateTask}
      />
    </>,
    document.body
  );
}

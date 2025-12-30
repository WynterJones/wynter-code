import { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import type { KanbanTask } from "@/types/kanban";
import { PRIORITY_COLORS, PRIORITY_DOT_COLORS } from "@/types/kanban";

const HOLD_DURATION = 1000; // 1 second

interface KanbanCardProps {
  task: KanbanTask;
  onEdit?: (task: KanbanTask) => void;
  onDelete?: (taskId: string) => void;
  onToggleLock?: (taskId: string) => void;
  showLockToggle?: boolean;
}

export function KanbanCard({ task, onEdit, onDelete, onToggleLock, showLockToggle }: KanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const deleteIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const clearDeleteTimers = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    if (deleteIntervalRef.current) {
      clearInterval(deleteIntervalRef.current);
      deleteIntervalRef.current = null;
    }
    setDeleteProgress(0);
  }, []);

  const handleDeletePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      // Capture the pointer to prevent mouse leave during hold
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Start progress animation
      const startTime = Date.now();
      deleteIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        setDeleteProgress(progress);
      }, 16);

      // Delete after hold duration
      deleteTimerRef.current = setTimeout(() => {
        clearDeleteTimers();
        onDelete?.(task.id);
      }, HOLD_DURATION);
    },
    [task.id, onDelete, clearDeleteTimers]
  );

  const handleDeletePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      clearDeleteTimers();
    },
    [clearDeleteTimers]
  );

  const handleDeletePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      clearDeleteTimers();
    },
    [clearDeleteTimers]
  );

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
        "relative p-3 rounded-lg border-l-4 bg-bg-secondary cursor-grab active:cursor-grabbing transition-all",
        "border border-border hover:border-border-hover hover:bg-bg-tertiary/50",
        PRIORITY_COLORS[task.priority],
        isDragging && "opacity-50 shadow-lg ring-2 ring-accent"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Actions (visible on hover) */}
      {isHovered && (onEdit || onDelete || showLockToggle) && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {showLockToggle && onToggleLock && (
            <Tooltip content={task.locked ? "Mark incomplete" : "Mark complete"}>
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(task.id);
                }}
                className={cn(
                  "h-6 w-6",
                  task.locked ? "bg-green-500/20 text-green-400" : "bg-bg-tertiary"
                )}
              >
                {task.locked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip content="Edit">
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="h-6 w-6 bg-bg-tertiary"
              >
                <Pencil className="w-3 h-3" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip content="Hold to delete">
              <div className="relative">
                {/* Progress ring */}
                {deleteProgress > 0 && (
                  <svg
                    className="absolute inset-0 w-6 h-6 -rotate-90"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-red-500/30"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${deleteProgress * 0.628} 100`}
                      className="text-red-500 transition-all"
                    />
                  </svg>
                )}
                <IconButton
                  size="sm"
                  variant="danger"
                  onPointerDown={handleDeletePointerDown}
                  onPointerUp={handleDeletePointerUp}
                  onPointerCancel={handleDeletePointerCancel}
                  className={cn(
                    "h-6 w-6 select-none touch-none",
                    deleteProgress > 0 && "bg-red-500/20"
                  )}
                >
                  <Trash2 className="w-3 h-3" />
                </IconButton>
              </div>
            </Tooltip>
          )}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-text-primary line-clamp-2 pr-14">
        {task.title}
      </p>

      {/* Description (if exists) */}
      {task.description && (
        <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer: Priority badge */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              PRIORITY_DOT_COLORS[task.priority]
            )}
          />
          <span className="text-[10px] text-text-secondary font-medium">
            P{task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}

interface KanbanCardPreviewProps {
  task: KanbanTask;
}

export function KanbanCardPreview({ task }: KanbanCardPreviewProps) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border-l-4 bg-bg-secondary shadow-xl cursor-grabbing",
        "border border-accent",
        PRIORITY_COLORS[task.priority]
      )}
    >
      <p className="text-sm font-medium text-text-primary line-clamp-2">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              PRIORITY_DOT_COLORS[task.priority]
            )}
          />
          <span className="text-[10px] text-text-secondary font-medium">
            P{task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}

interface LockedKanbanCardProps {
  task: KanbanTask;
  onToggleLock?: (taskId: string) => void;
}

export function LockedKanbanCard({ task, onToggleLock }: LockedKanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative px-2.5 py-1.5 rounded bg-bg-tertiary/30 border border-border/30 hover:border-border/50 transition-colors cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <p className="text-xs text-text-tertiary line-clamp-1 pr-6">{task.title}</p>

      {/* Uncheck button on hover */}
      {isHovered && onToggleLock && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1">
          <Tooltip content="Mark incomplete">
            <IconButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(task.id);
              }}
              className="h-5 w-5 bg-bg-tertiary"
            >
              <Square className="w-2.5 h-2.5" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

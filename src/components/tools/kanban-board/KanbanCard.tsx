import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton, Tooltip } from "@/components/ui";
import type { KanbanTask } from "@/types/kanban";
import { PRIORITY_COLORS, PRIORITY_DOT_COLORS } from "@/types/kanban";

interface KanbanCardProps {
  task: KanbanTask;
  onEdit?: (task: KanbanTask) => void;
  onDelete?: (taskId: string) => void;
}

export function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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
      {isHovered && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
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
            <Tooltip content="Delete">
              <IconButton
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                className="h-6 w-6"
              >
                <Trash2 className="w-3 h-3" />
              </IconButton>
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

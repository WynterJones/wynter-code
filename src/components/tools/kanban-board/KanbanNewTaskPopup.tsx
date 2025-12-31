import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { IconButton } from "@/components/ui";
import type { KanbanTask, KanbanPriority } from "@/types/kanban";
import { PRIORITY_LABELS } from "@/types/kanban";

interface KanbanNewTaskPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, priority: KanbanPriority, description?: string) => void;
  editTask?: KanbanTask | null;
  onUpdate?: (taskId: string, title: string, priority: KanbanPriority, description?: string) => void;
}

export function KanbanNewTaskPopup({
  isOpen,
  onClose,
  onSubmit,
  editTask,
  onUpdate,
}: KanbanNewTaskPopupProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<KanbanPriority>(2);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || "");
      setPriority(editTask.priority);
    } else {
      setTitle("");
      setDescription("");
      setPriority(2);
    }
  }, [editTask, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editTask && onUpdate) {
      onUpdate(
        editTask.id,
        title.trim(),
        priority,
        description.trim() || undefined
      );
    } else {
      onSubmit(title.trim(), priority, description.trim() || undefined);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-bg-secondary border border-border rounded-lg p-4 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-text-primary">
            {editTask ? "Edit Task" : "New Task"}
          </h3>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="kanban-task-title" className="block text-xs text-text-secondary mb-1">
              Title
            </label>
            <input
              id="kanban-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="kanban-task-description" className="block text-xs text-text-secondary mb-1">
              Description (optional)
            </label>
            <textarea
              id="kanban-task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="kanban-task-priority" className="block text-xs text-text-secondary mb-1">
              Priority
            </label>
            <div className="relative">
              <select
                id="kanban-task-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as KanbanPriority)}
                className="w-full appearance-none bg-bg-tertiary border border-border rounded-md px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {([0, 1, 2, 3, 4] as KanbanPriority[]).map((p) => (
                  <option key={p} value={p}>
                    P{p} - {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-3 py-1.5 text-sm bg-accent text-primary-950 rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editTask ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

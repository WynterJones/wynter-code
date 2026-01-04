import { useState } from "react";
import { Pencil, Trash2, Check, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Workspace, WorkspaceAvatar as WorkspaceAvatarType } from "@/types/workspace";
import { WorkspaceAvatar } from "./WorkspaceAvatar";
import { WorkspaceAvatarEditor } from "./WorkspaceAvatarEditor";

interface WorkspaceListItemProps {
  workspace: Workspace;
  isActive: boolean;
  projectCount: number;
  isEditing: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Workspace>) => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onFileBrowserOpenChange?: (isOpen: boolean) => void;
}

export function WorkspaceListItem({
  workspace,
  isActive,
  projectCount,
  isEditing,
  isDragging,
  onSelect,
  onUpdate,
  onDelete,
  onStartEdit,
  onStopEdit,
  onFileBrowserOpenChange,
}: WorkspaceListItemProps) {
  const [editName, setEditName] = useState(workspace.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: workspace.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(workspace.name);
    onStartEdit();
  };

  const handleSaveName = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    onUpdate({ name: editName.trim() });
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(workspace.name);
    onStopEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  // Auto-save avatar changes immediately
  const handleAvatarChange = (updates: Partial<WorkspaceAvatarType>) => {
    onUpdate({ avatar: { ...workspace.avatar, ...updates } });
  };

  // Auto-save color changes immediately
  const handleColorChange = (color: string) => {
    onUpdate({ color });
  };

  if (isEditing) {
    return (
      <div
        className="p-3 bg-bg-secondary rounded-lg border border-border space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Name input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Workspace name"
            autoFocus
            className="flex-1 px-2 py-1.5 text-sm bg-bg-tertiary border border-border rounded-md text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName(e as unknown as React.MouseEvent);
              if (e.key === "Escape") handleDone(e as unknown as React.MouseEvent);
            }}
          />
          {editName !== workspace.name && (
            <button
              onClick={handleSaveName}
              disabled={!editName.trim()}
              className="px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-50"
              title="Save name"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Avatar editor - changes auto-save */}
        <WorkspaceAvatarEditor
          avatar={workspace.avatar}
          color={workspace.color}
          onAvatarChange={handleAvatarChange}
          onColorChange={handleColorChange}
          onFileBrowserOpenChange={onFileBrowserOpenChange}
        />

        {/* Done button */}
        <div className="flex justify-end pt-2 border-t border-border">
          <button
            onClick={handleDone}
            className="btn-primary !px-3 !py-1.5 !text-xs"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-accent/10 border border-accent/30"
          : "hover:bg-bg-hover border border-transparent",
        (isDragging || isSortableDragging) && "opacity-50"
      )}
    >
      <WorkspaceAvatar avatar={workspace.avatar} color={workspace.color} size="md" />

      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary truncate">{workspace.name}</div>
        <div className="text-xs text-text-secondary">
          {projectCount} {projectCount === 1 ? "project" : "projects"}
        </div>
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleStartEdit}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          title="Edit workspace"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 text-text-secondary hover:text-accent-red hover:bg-bg-tertiary rounded transition-colors"
          title="Delete workspace"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 text-text-secondary/50 hover:text-text-secondary cursor-grab active:cursor-grabbing transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteGroup } from "@/types/netlifyFtp";

interface GroupHeaderProps {
  group: SiteGroup;
  siteCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, groupId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, groupId: string) => void;
  isDragOver?: boolean;
}

export function GroupHeader({
  group,
  siteCount,
  isCollapsed,
  onToggleCollapse,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver = false,
}: GroupHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== group.name) {
      onRename(trimmed);
    } else {
      setEditName(group.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  const startRename = () => {
    setShowContextMenu(false);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    onDelete();
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 px-1 py-1.5 cursor-pointer transition-colors group select-none",
          "hover:bg-bg-hover border-l-2",
          isDragOver
            ? "border-accent bg-accent/10"
            : "border-transparent"
        )}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, group.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, group.id)}
        onContextMenu={handleContextMenu}
        onClick={onToggleCollapse}
      >
        {/* Drag handle */}
        <div
          className="opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing p-0.5"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3 text-text-secondary" />
        </div>

        {/* Collapse chevron */}
        <ChevronRight
          className={cn(
            "w-3 h-3 text-text-secondary transition-transform shrink-0",
            !isCollapsed && "rotate-90"
          )}
        />

        {/* Group name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-xs bg-bg-secondary border border-accent rounded px-1 py-0.5 outline-none text-text-primary"
            autoFocus
          />
        ) : (
          <span className="flex-1 min-w-0 text-xs text-text-primary truncate font-medium">
            {group.name}
          </span>
        )}

        {/* Site count */}
        <span className="text-[10px] text-text-secondary tabular-nums">
          {siteCount}
        </span>
      </div>

      {/* Context menu - rendered via portal to escape overflow:hidden */}
      {showContextMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            className="fixed z-[9999] bg-bg-primary border border-border rounded-md shadow-xl py-1 min-w-[120px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary hover:bg-bg-hover transition-colors"
              onClick={startRename}
            >
              <Pencil className="w-3 h-3" />
              Rename
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-accent-red hover:bg-bg-hover transition-colors"
              onClick={handleDelete}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

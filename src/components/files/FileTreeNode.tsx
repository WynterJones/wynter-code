import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onToggle: (node: FileNode) => void;
  onFileOpen?: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
  onNodeModulesClick?: () => void;
  onMoveItem?: (sourcePath: string, destinationFolder: string) => Promise<void>;
}

export function FileTreeNode({
  node,
  depth,
  onToggle,
  onFileOpen,
  onContextMenu,
  onNodeModulesClick,
  onMoveItem,
}: FileTreeNodeProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const handleClick = () => {
    if (node.isDirectory) {
      // Special handling for node_modules - switch to Modules tab
      if (node.name === "node_modules" && onNodeModulesClick) {
        onNodeModulesClick();
        return;
      }
      onToggle(node);
    } else {
      onFileOpen?.(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, node);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("application/x-wynter-file", JSON.stringify({
      path: node.path,
      name: node.name,
      isDirectory: node.isDirectory
    }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!node.isDirectory) return;

    e.preventDefault();
    e.stopPropagation();

    const data = e.dataTransfer.getData("application/x-wynter-file");
    if (data) {
      try {
        const draggedItem = JSON.parse(data);
        // Don't allow dropping on itself or its parent
        if (draggedItem.path === node.path) return;
        // Don't allow dropping a folder into its own descendant
        if (draggedItem.isDirectory && node.path.startsWith(draggedItem.path + "/")) return;
      } catch {
        // Ignore parse errors
      }
    }

    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!node.isDirectory) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!node.isDirectory || !onMoveItem) return;

    const data = e.dataTransfer.getData("application/x-wynter-file");
    if (!data) return;

    try {
      const draggedItem = JSON.parse(data);

      // Don't drop on itself
      if (draggedItem.path === node.path) return;

      // Don't drop a folder into its own descendant
      if (draggedItem.isDirectory && node.path.startsWith(draggedItem.path + "/")) return;

      // Don't drop into the same parent folder
      const parentPath = draggedItem.path.substring(0, draggedItem.path.lastIndexOf("/"));
      if (parentPath === node.path) return;

      await onMoveItem(draggedItem.path, node.path);
    } catch (error) {
      console.error("Failed to move item:", error);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors",
          "text-sm text-text-primary",
          node.isIgnored && "opacity-50",
          isDragOver && node.isDirectory && "bg-accent/20 ring-1 ring-accent ring-inset"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDirectory ? (
          <span className="w-4 h-4 flex items-center justify-center text-text-secondary">
            {node.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4" />
        )}

        <FileIcon
          name={node.name}
          isDirectory={node.isDirectory}
          isExpanded={node.isExpanded}
        />

        <span className="truncate">{node.name}</span>
      </div>

      {node.isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onFileOpen={onFileOpen}
              onContextMenu={onContextMenu}
              onNodeModulesClick={onNodeModulesClick}
              onMoveItem={onMoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

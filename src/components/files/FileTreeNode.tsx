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
}

export function FileTreeNode({
  node,
  depth,
  onToggle,
  onFileOpen,
  onContextMenu,
  onNodeModulesClick,
}: FileTreeNodeProps) {
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
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!node.isDirectory}
        onDragStart={handleDragStart}
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors",
          "text-sm text-text-primary",
          node.isIgnored && "opacity-50"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

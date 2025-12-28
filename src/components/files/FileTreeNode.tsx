import { useState, useMemo, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/storageUtils";
import { useDragStore } from "@/stores/dragStore";
import type { FileNode } from "@/types";
import {
  type GitStatusMap,
  type GitFileStatusType,
  getGitStatusColor,
} from "@/hooks/useGitStatus";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onToggle: (node: FileNode) => void;
  onFileOpen?: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNode) => void;
  onNodeModulesClick?: () => void;
  onMoveItem?: (sourcePath: string, destinationFolder: string) => Promise<void>;
  onMoveItems?: (sourcePaths: string[], destinationFolder: string) => Promise<void>;
  gitStatusMap?: GitStatusMap;
  selectedPaths?: Set<string>;
  onSelect?: (node: FileNode, shiftKey: boolean) => void;
  allNodes?: FileNode[];
}

export function FileTreeNode({
  node,
  depth,
  onToggle,
  onFileOpen,
  onContextMenu,
  onNodeModulesClick,
  onMoveItem,
  onMoveItems,
  gitStatusMap,
  selectedPaths,
  onSelect,
  allNodes,
}: FileTreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const startDrag = useDragStore((s) => s.startDrag);
  const draggedFiles = useDragStore((s) => s.draggedFiles);
  const isDragging = useDragStore((s) => s.isDragging);
  const hoverTargetPath = useDragStore((s) => s.hoverTargetPath);

  const isSelected = selectedPaths?.has(node.path) ?? false;
  const isBeingDragged = isDragging && draggedFiles.some(f => f.path === node.path);

  // Compute git status for this node
  const gitStatus = useMemo((): GitFileStatusType | undefined => {
    if (!gitStatusMap) return undefined;

    // For files, look up directly
    if (!node.isDirectory) {
      return gitStatusMap.get(node.path);
    }

    // For directories, check if any children have status
    let hasModified = false;
    let hasNew = false;

    for (const [path, status] of gitStatusMap) {
      if (path.startsWith(node.path + "/")) {
        if (status === "conflict") return "conflict";
        if (status === "modified" || status === "deleted" || status === "renamed") {
          hasModified = true;
        }
        if (status === "untracked" || status === "new") {
          hasNew = true;
        }
      }
    }

    if (hasModified) return "modified";
    if (hasNew) return "untracked";
    return undefined;
  }, [gitStatusMap, node.path, node.isDirectory]);

  const gitStatusColorClass = getGitStatusColor(gitStatus);

  const handleClick = (e: React.MouseEvent) => {
    // Handle selection with shift key
    if (onSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSelect(node, e.shiftKey);
      return;
    }

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

  // Use mousedown for drag initiation (HTML5 drag doesn't work in Tauri)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left mouse button, and not if clicking on chevron or during text selection
    if (e.button !== 0) return;

    // Don't start drag if holding modifier keys (those are for selection)
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);

      // Only start drag after moving 5px (to distinguish from clicks)
      if (!hasMoved && (dx > 5 || dy > 5)) {
        hasMoved = true;

        console.log("[DragStart]", node.name, { isSelected, selectedCount: selectedPaths?.size });
        const fileInfo = {
          path: node.path,
          name: node.name,
          isDirectory: node.isDirectory
        };

        // If this file is selected and there are multiple selections, drag all selected files
        const additionalFiles: { path: string; name: string; isDirectory: boolean }[] = [];
        if (isSelected && selectedPaths && selectedPaths.size > 1 && allNodes) {
          const findNode = (nodes: FileNode[], path: string): FileNode | null => {
            for (const n of nodes) {
              if (n.path === path) return n;
              if (n.children) {
                const found = findNode(n.children, path);
                if (found) return found;
              }
            }
            return null;
          };

          for (const path of selectedPaths) {
            if (path !== node.path) {
              const selectedNode = findNode(allNodes, path);
              if (selectedNode) {
                additionalFiles.push({
                  path: selectedNode.path,
                  name: selectedNode.name,
                  isDirectory: selectedNode.isDirectory
                });
              }
            }
          }
        }

        // Start drag with mouse position
        startDrag(fileInfo, additionalFiles, { x: moveEvent.clientX, y: moveEvent.clientY });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div>
      <div
        ref={rowRef}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        data-folder={node.isDirectory ? "true" : undefined}
        data-path={node.path}
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-bg-hover transition-colors group",
          "text-sm text-text-primary",
          node.isIgnored && "opacity-50",
          isSelected && "bg-accent/20",
          // Only highlight the folder being hovered during drag
          hoverTargetPath === node.path && "bg-accent/40 ring-2 ring-accent",
          isBeingDragged && "opacity-40"
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

        <span className={cn("truncate flex-1", gitStatusColorClass)}>{node.name}</span>

        {/* File size on hover - only for files */}
        {isHovered && !node.isDirectory && node.size !== undefined && (
          <span className="text-xs text-text-secondary ml-auto pr-1 whitespace-nowrap">
            {formatBytes(node.size)}
          </span>
        )}
      </div>

      {node.isExpanded && node.children && (
        <div>
          {node.children.filter((c) => c.name !== ".DS_Store").map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onFileOpen={onFileOpen}
              onContextMenu={onContextMenu}
              onNodeModulesClick={onNodeModulesClick}
              onMoveItem={onMoveItem}
              onMoveItems={onMoveItems}
              gitStatusMap={gitStatusMap}
              selectedPaths={selectedPaths}
              onSelect={onSelect}
              allNodes={allNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

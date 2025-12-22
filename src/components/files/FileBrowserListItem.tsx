import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types";
import {
  type GitFileStatusType,
  getGitStatusColor,
} from "@/hooks/useGitStatus";

interface FileBrowserListItemProps {
  node: FileNode;
  isSelected: boolean;
  onSelect: (node: FileNode) => void;
  onOpen: (node: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  gitStatus?: GitFileStatusType;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBrowserListItem({
  node,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  gitStatus,
}: FileBrowserListItemProps) {
  const gitStatusColorClass = getGitStatusColor(gitStatus);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(node);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors",
        "hover:bg-bg-hover",
        isSelected && "bg-accent/10 text-accent",
        node.isIgnored && "opacity-50"
      )}
    >
      <FileIcon
        name={node.name}
        isDirectory={node.isDirectory}
        isExpanded={false}
      />
      <span className={cn("flex-1 truncate text-sm", gitStatusColorClass)}>
        {node.name}
      </span>
      {node.size !== undefined && !node.isDirectory && (
        <span className="text-xs text-text-secondary">
          {formatFileSize(node.size)}
        </span>
      )}
    </div>
  );
}

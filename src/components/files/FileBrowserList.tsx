import { useMemo } from "react";
import { FileBrowserListItem } from "./FileBrowserListItem";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui";
import type { FileNode } from "@/types";
import { type GitStatusMap, type GitFileStatusType } from "@/hooks/useGitStatus";

interface FileBrowserListProps {
  files: FileNode[];
  selectedPaths: Set<string>;
  loading: boolean;
  showHiddenFiles: boolean;
  onSelect: (file: FileNode, shiftKey: boolean, ctrlKey: boolean) => void;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
  onClearSelection: () => void;
  gitStatusMap?: GitStatusMap;
}

export function FileBrowserList({
  files,
  selectedPaths,
  loading,
  showHiddenFiles,
  onSelect,
  onOpen,
  onContextMenu,
  onClearSelection,
  gitStatusMap,
}: FileBrowserListProps) {
  // Helper to get status for a node (file or directory)
  const getNodeStatus = useMemo(() => {
    if (!gitStatusMap) return () => undefined;

    return (node: FileNode): GitFileStatusType | undefined => {
      if (!node.isDirectory) {
        return gitStatusMap.get(node.path);
      }

      // For directories, check children
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
    };
  }, [gitStatusMap]);
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        This folder is empty
      </div>
    );
  }

  const filteredFiles = showHiddenFiles
    ? files
    : files.filter((f) => !f.name.startsWith("."));

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking on the container itself, not on a file item
    if (e.target === e.currentTarget) {
      onClearSelection();
    }
  };

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="pb-1 min-h-full" onClick={handleContainerClick}>
        {sortedFiles.map((file) => (
          <FileBrowserListItem
            key={file.path}
            node={file}
            isSelected={selectedPaths.has(file.path)}
            onSelect={onSelect}
            onOpen={onOpen}
            onContextMenu={onContextMenu}
            gitStatus={getNodeStatus(file)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

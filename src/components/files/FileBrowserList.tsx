import { FileBrowserListItem } from "./FileBrowserListItem";
import { Loader2 } from "lucide-react";
import type { FileNode } from "@/types";

interface FileBrowserListProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  loading: boolean;
  onSelect: (file: FileNode) => void;
  onOpen: (file: FileNode) => void;
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void;
}

export function FileBrowserList({
  files,
  selectedFile,
  loading,
  onSelect,
  onOpen,
  onContextMenu,
}: FileBrowserListProps) {
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

  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="pb-1">
        {sortedFiles.map((file) => (
          <FileBrowserListItem
            key={file.path}
            node={file}
            isSelected={selectedFile?.path === file.path}
            onSelect={onSelect}
            onOpen={onOpen}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}

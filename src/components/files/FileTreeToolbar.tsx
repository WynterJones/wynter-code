import { FilePlus, FolderPlus } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";

interface FileTreeToolbarProps {
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export function FileTreeToolbar({ onCreateFile, onCreateFolder }: FileTreeToolbarProps) {
  return (
    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-bg-secondary/90 backdrop-blur-sm rounded-lg p-1 border border-border shadow-lg z-10">
      <Tooltip content="New File" side="top">
        <IconButton size="sm" onClick={onCreateFile} aria-label="Create new file">
          <FilePlus className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip content="New Folder" side="top">
        <IconButton size="sm" onClick={onCreateFolder} aria-label="Create new folder">
          <FolderPlus className="w-4 h-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

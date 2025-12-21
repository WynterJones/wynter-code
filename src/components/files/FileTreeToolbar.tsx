import { FilePlus, FolderPlus } from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";

interface FileTreeToolbarProps {
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export function FileTreeToolbar({ onCreateFile, onCreateFolder }: FileTreeToolbarProps) {
  return (
    <div className="flex items-center justify-end px-2 py-1.5 border-b border-border gap-1">
      <Tooltip content="New File" side="bottom">
        <IconButton size="sm" onClick={onCreateFile}>
          <FilePlus className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip content="New Folder" side="bottom">
        <IconButton size="sm" onClick={onCreateFolder}>
          <FolderPlus className="w-4 h-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
}

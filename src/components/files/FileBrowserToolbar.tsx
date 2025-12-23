import { FilePlus, FolderPlus, Copy, Eye, ImagePlus, FolderOpen } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import type { FileNode } from "@/types";

interface FileBrowserToolbarProps {
  selectedFile: FileNode | null;
  selectedCount: number;
  mode: "selectProject" | "browse";
  showQuickLook: boolean;
  selectButtonLabel?: string;
  onCopyPath: () => void;
  onToggleQuickLook: () => void;
  onSendToPrompt: () => void;
  onSelectProject: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];

function isImageFile(file: FileNode | null): boolean {
  if (!file || file.isDirectory) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

export function FileBrowserToolbar({
  selectedFile,
  selectedCount,
  mode,
  showQuickLook,
  selectButtonLabel = "Open as Project",
  onCopyPath,
  onToggleQuickLook,
  onSendToPrompt,
  onSelectProject,
  onCreateFile,
  onCreateFolder,
}: FileBrowserToolbarProps) {
  const hasSelection = selectedCount > 0;
  const hasMultipleSelection = selectedCount > 1;
  const showOpenAsProject = mode === "selectProject" && selectedFile?.isDirectory && !hasMultipleSelection;
  const showSendToPrompt = isImageFile(selectedFile) && !hasMultipleSelection;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-secondary flex-shrink-0 rounded-b-lg">
      <div className="flex items-center gap-1">
        <Tooltip content="New File">
          <IconButton size="sm" onClick={onCreateFile}>
            <FilePlus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
        <Tooltip content="New Folder">
          <IconButton size="sm" onClick={onCreateFolder}>
            <FolderPlus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
        {hasMultipleSelection && (
          <span className="text-xs text-text-secondary ml-2">
            {selectedCount} items selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onCopyPath} disabled={!hasSelection}>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          {hasMultipleSelection ? `Copy ${selectedCount} Paths` : "Copy Path"}
        </Button>
        <Button
          size="sm"
          variant={showQuickLook ? "default" : "ghost"}
          onClick={onToggleQuickLook}
          disabled={!hasSelection}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          Quick Look
        </Button>

        {showSendToPrompt && (
          <Button size="sm" variant="ghost" onClick={onSendToPrompt}>
            <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
            Send to Prompt
          </Button>
        )}

        {showOpenAsProject && (
          <Button size="sm" variant="primary" onClick={onSelectProject}>
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            {selectButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

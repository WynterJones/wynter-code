import { FileEdit, FilePlus, FileX, Plus, Minus, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui";
import type { GitFile } from "@/services/git";

interface FileChangeItemProps {
  file: GitFile;
  isStaged: boolean;
  isLoading?: boolean;
  isViewingDiff?: boolean;
  onToggleStage: (file: GitFile) => void;
  onViewDiff?: () => void;
}

const statusConfig = {
  M: { icon: FileEdit, color: "text-accent-yellow", label: "Modified" },
  A: { icon: FilePlus, color: "text-accent-green", label: "Added" },
  D: { icon: FileX, color: "text-accent-red", label: "Deleted" },
  "?": { icon: FilePlus, color: "text-accent-blue", label: "Untracked" },
  U: { icon: FileEdit, color: "text-accent-orange", label: "Updated" },
};

export function FileChangeItem({
  file,
  isStaged,
  isLoading,
  isViewingDiff,
  onToggleStage,
  onViewDiff,
}: FileChangeItemProps) {
  const config = statusConfig[file.status] || statusConfig["M"];
  const FileIcon = config.icon;

  const handleStageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoading) {
      onToggleStage(file);
    }
  };

  const handleDiffClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDiff?.();
  };

  // Only show diff button for modified files (not untracked)
  const canShowDiff = file.status !== "?";

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors",
        "hover:bg-bg-hover",
        isViewingDiff && "bg-accent/10",
        isLoading && "opacity-50 pointer-events-none"
      )}
      title={`${config.label}: ${file.path}`}
    >
      {/* Stage/Unstage Button */}
      <button
        onClick={handleStageClick}
        className="w-4 h-4 flex items-center justify-center shrink-0"
        title={isStaged ? "Unstage file" : "Stage file"}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
        ) : isStaged ? (
          <Minus className="w-3 h-3 text-accent-red opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <Plus className="w-3 h-3 text-accent-green opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      <FileIcon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
      <span className="text-text-primary truncate flex-1">{file.path}</span>

      {/* View Diff Button */}
      {canShowDiff && (
        <IconButton
          size="sm"
          onClick={handleDiffClick}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isViewingDiff && "opacity-100 bg-accent/20"
          )}
          title={isViewingDiff ? "Hide diff" : "View diff"}
          aria-label={isViewingDiff ? "Hide file diff" : "View file diff"}
        >
          {isViewingDiff ? (
            <EyeOff className="w-3 h-3" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
        </IconButton>
      )}

      <span
        className={cn(
          "text-[10px] font-mono uppercase shrink-0",
          config.color
        )}
      >
        {file.status === "?" ? "U" : file.status}
      </span>
    </div>
  );
}

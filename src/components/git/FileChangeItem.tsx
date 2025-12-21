import { FileEdit, FilePlus, FileX, Plus, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GitFile } from "@/services/git";

interface FileChangeItemProps {
  file: GitFile;
  isStaged: boolean;
  isLoading?: boolean;
  onToggleStage: (file: GitFile) => void;
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
  onToggleStage,
}: FileChangeItemProps) {
  const config = statusConfig[file.status] || statusConfig["M"];
  const FileIcon = config.icon;

  const handleClick = () => {
    if (!isLoading) {
      onToggleStage(file);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer transition-colors",
        "hover:bg-bg-hover",
        isLoading && "opacity-50 pointer-events-none"
      )}
      onClick={handleClick}
      title={`${config.label}: ${file.path}`}
    >
      <span className="w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
        ) : isStaged ? (
          <Minus className="w-3 h-3 text-accent-red opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : (
          <Plus className="w-3 h-3 text-accent-green opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
      <FileIcon className={cn("w-3.5 h-3.5 shrink-0", config.color)} />
      <span className="text-text-primary truncate flex-1">{file.path}</span>
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

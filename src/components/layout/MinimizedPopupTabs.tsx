import { X, FileCode, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";
import { useMinimizedPopupsStore } from "@/stores";

interface MinimizedPopupTabsProps {
  projectId: string;
}

export function MinimizedPopupTabs({ projectId }: MinimizedPopupTabsProps) {
  const { getPopupsForProject, restore, remove } = useMinimizedPopupsStore();
  const minimizedPopups = getPopupsForProject(projectId);

  if (minimizedPopups.length === 0) return null;

  const handleRestore = (id: string) => {
    restore(id);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    remove(id);
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5">
      {minimizedPopups.map((popup) => (
        <Tooltip key={popup.id} content={popup.filePath} side="top">
          <button
            onClick={() => handleRestore(popup.id)}
            className={cn(
              "group flex items-center gap-1.5 px-2 py-1 rounded",
              "bg-bg-secondary border border-border",
              "hover:bg-bg-hover hover:border-accent/50",
              "transition-all duration-150",
              "text-xs"
            )}
          >
            {popup.type === "markdown" ? (
              <FileText className="w-3.5 h-3.5 text-accent-blue" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-accent-green" />
            )}
            <span className="text-text-primary max-w-[100px] truncate">
              {popup.fileName}
            </span>
            <button
              onClick={(e) => handleClose(e, popup.id)}
              className={cn(
                "p-0.5 rounded opacity-0 group-hover:opacity-100",
                "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
                "transition-opacity"
              )}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

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
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
      {minimizedPopups.map((popup) => (
        <Tooltip key={popup.id} content={popup.filePath} side="top">
          <button
            onClick={() => handleRestore(popup.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg",
              "bg-bg-secondary border border-border",
              "hover:bg-bg-hover hover:border-accent/50",
              "transition-all duration-150",
              "shadow-lg"
            )}
          >
            {popup.type === "markdown" ? (
              <FileText className="w-4 h-4 text-accent-blue" />
            ) : (
              <FileCode className="w-4 h-4 text-accent-green" />
            )}
            <span className="text-sm text-text-primary max-w-[120px] truncate">
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
              <X className="w-3 h-3" />
            </button>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}

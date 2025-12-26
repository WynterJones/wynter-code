import { LauncherItem } from "@/types/launcher";

interface LauncherFooterProps {
  selectedItem: LauncherItem | null;
  isActionsPanelOpen: boolean;
}

export function LauncherFooter({
  selectedItem,
}: LauncherFooterProps) {
  const defaultActionTitle = selectedItem?.defaultAction?.title || "Open";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-bg-tertiary/50">
      {/* Default action */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">{defaultActionTitle}</span>
        <kbd className="text-xs text-text-secondary bg-bg-hover px-1.5 py-0.5 rounded font-mono">
          Enter
        </kbd>
      </div>

      {/* Actions shortcut */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Actions</span>
          <kbd className="text-xs text-text-secondary bg-bg-hover px-1.5 py-0.5 rounded font-mono">
            Cmd+K
          </kbd>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Close</span>
          <kbd className="text-xs text-text-secondary bg-bg-hover px-1.5 py-0.5 rounded font-mono">
            Esc
          </kbd>
        </div>
      </div>
    </div>
  );
}

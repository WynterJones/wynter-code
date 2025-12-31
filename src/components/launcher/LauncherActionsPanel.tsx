import { useEffect, useState } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { SCROLLBAR_AUTO_HIDE_DELAY } from "@/lib/constants";
import { LauncherItem, LauncherAction } from "@/types/launcher";

interface LauncherActionsPanelProps {
  isOpen: boolean;
  selectedItem: LauncherItem | null;
  onClose: () => void;
  onExecuteAction: (action: LauncherAction) => void;
}

export function LauncherActionsPanel({
  isOpen,
  selectedItem,
  onClose,
  onExecuteAction,
}: LauncherActionsPanelProps) {
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const actions = selectedItem?.actions || [];

  useEffect(() => {
    setSelectedActionIndex(0);
  }, [selectedItem]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedActionIndex((prev) =>
          prev < actions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedActionIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (actions[selectedActionIndex]) {
          onExecuteAction(actions[selectedActionIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, actions, selectedActionIndex, onExecuteAction, onClose]);

  return (
    <div
      className={cn(
        "absolute inset-y-0 right-0 w-64 bg-bg-tertiary border-l border-border",
        "transform transition-transform duration-150 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">Actions</h3>
        <p className="text-xs text-text-secondary truncate mt-0.5">
          {selectedItem?.title}
        </p>
      </div>

      <OverlayScrollbarsComponent
        className="flex-1 max-h-[calc(100%-60px)]"
        options={{
          scrollbars: {
            autoHide: "leave",
            autoHideDelay: SCROLLBAR_AUTO_HIDE_DELAY,
            theme: "os-theme-custom",
          },
        }}
      >
        <div className="p-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => onExecuteAction(action)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                selectedActionIndex === index
                  ? "bg-accent/20 text-accent"
                  : "hover:bg-bg-hover text-text-primary"
              )}
            >
              <span
                className={cn(
                  "text-text-secondary",
                  selectedActionIndex === index && "text-accent"
                )}
              >
                {action.icon}
              </span>
              <span className="flex-1 text-sm">{action.title}</span>
              {action.shortcut && (
                <kbd className="text-[10px] text-text-secondary bg-bg-hover px-1.5 py-0.5 rounded font-mono">
                  {action.shortcut}
                </kbd>
              )}
            </button>
          ))}
        </div>
      </OverlayScrollbarsComponent>
    </div>
  );
}

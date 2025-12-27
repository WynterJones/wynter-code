import { X, HardDrive } from "lucide-react";
import { useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useSystemCleanerStore } from "@/stores/systemCleanerStore";
import { CleanerSidebar } from "./CleanerSidebar";
import { LargeFilesView } from "./LargeFilesView";
import { AppCachesView } from "./AppCachesView";
import { InstalledAppsView } from "./InstalledAppsView";

interface SystemCleanerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  "large-files": "Large Files",
  "app-caches": "App Caches",
  "installed-apps": "Installed Apps",
};

export function SystemCleanerPopup({ isOpen, onClose }: SystemCleanerPopupProps) {
  const { activeCategory, reset } = useSystemCleanerStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3" data-tauri-drag-region>
            <HardDrive className="w-5 h-5 text-accent" />
            <span className="font-medium text-text-primary">System Cleaner</span>
            <span className="text-sm text-text-tertiary">
              / {CATEGORY_NAMES[activeCategory]}
            </span>
          </div>
          <Tooltip content="Close (Esc)" side="bottom">
            <IconButton size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          <CleanerSidebar />

          <div className="flex-1 overflow-hidden">
            {activeCategory === "large-files" && <LargeFilesView />}
            {activeCategory === "app-caches" && <AppCachesView />}
            {activeCategory === "installed-apps" && <InstalledAppsView />}
          </div>
        </div>
      </div>
    </div>
  );
}

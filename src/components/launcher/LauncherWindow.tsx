import { useEffect, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLauncherStore } from "@/stores/launcherStore";
import { useLauncherSearch } from "@/hooks/useLauncherSearch";
import { LauncherSearchInput } from "./LauncherSearchInput";
import { LauncherResultsList } from "./LauncherResultsList";
import { LauncherActionsPanel } from "./LauncherActionsPanel";
import { LauncherFooter } from "./LauncherFooter";
import { LauncherItem, LauncherAction } from "@/types/launcher";
import { cn } from "@/lib/utils";

export function LauncherWindow() {
  const {
    selectedIndex,
    setSelectedIndex,
    setTotalItems,
    isActionsPanelOpen,
    toggleActionsPanel,
    closeActionsPanel,
    recordUsage,
    reset,
  } = useLauncherStore();

  const { results, isLoading } = useLauncherSearch();
  const selectedItem = results[selectedIndex] || null;
  const [isVisible, setIsVisible] = useState(false);

  // Trigger entry animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Update total items count
  useEffect(() => {
    setTotalItems(results.length);
  }, [results.length, setTotalItems]);

  // Reset store on mount
  useEffect(() => {
    reset();
  }, []);

  // Handle blur to close
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const setupBlurListener = async () => {
      const unlisten = await appWindow.onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          invoke("hide_launcher_window");
        }
      });
      return unlisten;
    };

    const unlistenPromise = setupBlurListener();
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Execute item's default action
  const executeItem = useCallback(
    (item: LauncherItem) => {
      recordUsage(item.id);
      closeActionsPanel();
      item.defaultAction.onExecute();
      invoke("hide_launcher_window");
    },
    [recordUsage, closeActionsPanel]
  );

  // Execute a specific action
  const executeAction = useCallback(
    (action: LauncherAction) => {
      if (selectedItem) {
        recordUsage(selectedItem.id);
      }
      closeActionsPanel();
      action.onExecute();
      invoke("hide_launcher_window");
    },
    [selectedItem, recordUsage, closeActionsPanel]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if actions panel is open (it handles its own keys)
      if (isActionsPanelOpen && ["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedItem) {
          executeItem(selectedItem);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (isActionsPanelOpen) {
          closeActionsPanel();
        } else {
          invoke("hide_launcher_window");
        }
      } else if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedItem) {
          toggleActionsPanel();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIndex,
    results.length,
    selectedItem,
    isActionsPanelOpen,
    setSelectedIndex,
    executeItem,
    toggleActionsPanel,
    closeActionsPanel,
  ]);

  return (
    <div
      className={cn(
        "w-full h-full bg-bg-primary/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col",
        "transition-all duration-200 ease-out",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        // Ensure proper rounded masking
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
      }}
    >
      {/* Search Input */}
      <LauncherSearchInput isLoading={isLoading} />

      {/* Results */}
      <div className="flex-1 overflow-hidden relative">
        <LauncherResultsList
          results={results}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onExecute={executeItem}
          isLoading={isLoading}
        />

        {/* Actions Panel (slides in from right) */}
        <LauncherActionsPanel
          isOpen={isActionsPanelOpen}
          selectedItem={selectedItem}
          onClose={closeActionsPanel}
          onExecuteAction={executeAction}
        />
      </div>

      {/* Footer */}
      <LauncherFooter
        selectedItem={selectedItem}
        isActionsPanelOpen={isActionsPanelOpen}
      />
    </div>
  );
}

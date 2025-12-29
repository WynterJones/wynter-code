import { useState, useEffect, useCallback } from "react";
import { useCodespaceStore } from "@/stores/codespaceStore";
import { useDragStore } from "@/stores/dragStore";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { CodespaceTabBar } from "./CodespaceTabBar";
import { CodespaceEditorPane } from "./CodespaceEditorPane";
import { CodespaceEmptyState } from "./CodespaceEmptyState";
import { cn } from "@/lib/utils";

interface DraggedFile {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface CodespaceEditorProps {
  sessionId: string;
  projectPath: string;
}

export function CodespaceEditor({ sessionId, projectPath }: CodespaceEditorProps) {
  const {
    getCodespaceState,
    openFile,
    closeTab,
    setActiveTab,
    updateContent,
    saveFile,
    reloadFiles,
    clearPendingGoToLine,
  } = useCodespaceStore();

  const isDragging = useDragStore((s) => s.isDragging);
  const hoverTarget = useDragStore((s) => s.hoverTargetPath);

  const state = getCodespaceState(sessionId);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [pendingCloseTabId, setPendingCloseTabId] = useState<string | null>(null);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

  // Reload file contents on mount (after localStorage restore)
  useEffect(() => {
    if (state.tabs.length > 0 && state.tabs[0].content === "") {
      reloadFiles(sessionId);
    }
  }, [sessionId, state.tabs, reloadFiles]);

  // Handle Cmd/Ctrl+S to save active file
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (state.activeTabId) {
          saveFile(sessionId, state.activeTabId);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sessionId, state.activeTabId, saveFile]);

  // Handle drag & drop from file sidebar
  useEffect(() => {
    const handleFileDrop = (e: CustomEvent<{ files: DraggedFile[] }>) => {
      for (const file of e.detail.files) {
        if (!file.isDirectory) {
          openFile(sessionId, file.path);
        }
      }
    };
    window.addEventListener("codespace-file-drop", handleFileDrop as EventListener);
    return () => window.removeEventListener("codespace-file-drop", handleFileDrop as EventListener);
  }, [sessionId, openFile]);

  const handleOpenFile = useCallback(() => {
    setShowFileBrowser(true);
  }, []);

  const handleFileSelect = useCallback(
    async (path: string) => {
      await openFile(sessionId, path);
      setShowFileBrowser(false);
    },
    [sessionId, openFile]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = state.tabs.find((t) => t.id === tabId);
      if (tab?.isDirty) {
        setPendingCloseTabId(tabId);
        return;
      }
      closeTab(sessionId, tabId);
    },
    [sessionId, state.tabs, closeTab]
  );

  const handleConfirmClose = useCallback(() => {
    if (pendingCloseTabId) {
      // Force close without saving
      const { codespaces } = useCodespaceStore.getState();
      const current = codespaces.get(sessionId);
      if (current) {
        const newTabs = current.tabs.filter((t) => t.id !== pendingCloseTabId);
        let newActiveTabId = current.activeTabId;
        if (current.activeTabId === pendingCloseTabId) {
          const closedIndex = current.tabs.findIndex((t) => t.id === pendingCloseTabId);
          newActiveTabId = newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id || null;
        }
        useCodespaceStore.setState({
          codespaces: new Map(codespaces).set(sessionId, {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            pendingGoToLine: null,
          }),
        });
      }
      setPendingCloseTabId(null);
    }
  }, [sessionId, pendingCloseTabId]);

  const handleSaveAndClose = useCallback(async () => {
    if (pendingCloseTabId) {
      await saveFile(sessionId, pendingCloseTabId);
      closeTab(sessionId, pendingCloseTabId);
      setPendingCloseTabId(null);
    }
  }, [sessionId, pendingCloseTabId, saveFile, closeTab]);

  const handleCancelClose = useCallback(() => {
    setPendingCloseTabId(null);
  }, []);

  const handleContentChange = useCallback(
    (content: string) => {
      if (state.activeTabId) {
        updateContent(sessionId, state.activeTabId, content);
      }
    },
    [sessionId, state.activeTabId, updateContent]
  );

  const isDropTarget = isDragging && hoverTarget === "codespace";

  if (state.tabs.length === 0) {
    return (
      <div
        data-dropzone="codespace"
        className={cn(
          "flex-1 flex flex-col",
          isDropTarget && "ring-2 ring-accent ring-inset"
        )}
      >
        <CodespaceEmptyState onOpenFile={handleOpenFile} />
        <FileBrowserPopup
          isOpen={showFileBrowser}
          onClose={() => setShowFileBrowser(false)}
          initialPath={projectPath}
          mode="selectFile"
          selectButtonLabel="Open"
          onSelectFile={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div
      data-dropzone="codespace"
      className={cn(
        "flex-1 flex flex-col overflow-hidden",
        isDropTarget && "ring-2 ring-accent ring-inset"
      )}
    >
      <CodespaceTabBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        onSelectTab={(id) => setActiveTab(sessionId, id)}
        onCloseTab={handleCloseTab}
        onOpenFile={handleOpenFile}
        isDropTarget={isDropTarget}
      />

      {activeTab && (
        <CodespaceEditorPane
          tab={activeTab}
          onChange={handleContentChange}
          pendingGoToLine={state.pendingGoToLine}
          onClearPendingGoToLine={() => clearPendingGoToLine(sessionId)}
        />
      )}

      {/* Unsaved changes confirmation dialog */}
      {pendingCloseTabId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border rounded-lg shadow-xl p-4 max-w-sm">
            <h3 className="text-sm font-medium text-text-primary mb-2">
              Unsaved Changes
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Do you want to save changes to{" "}
              <span className="font-mono text-text-primary">
                {state.tabs.find((t) => t.id === pendingCloseTabId)?.fileName}
              </span>
              ?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelClose}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 rounded transition-colors"
              >
                Don&apos;t Save
              </button>
              <button
                onClick={handleSaveAndClose}
                className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/80 text-primary-950 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={projectPath}
        mode="selectFile"
        selectButtonLabel="Open"
        onSelectFile={handleFileSelect}
      />
    </div>
  );
}

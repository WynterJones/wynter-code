import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FileBrowserHeader } from "@/components/files/FileBrowserHeader";
import { FileBrowserList } from "@/components/files/FileBrowserList";
import { QuickLookPreview } from "@/components/files/QuickLookPreview";
import { useGitStatus } from "@/hooks/useGitStatus";
import type { FileNode } from "@/types";
import type { PanelContentProps } from "@/types/panel";

export function FileBrowserPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [currentPath, setCurrentPath] = useState(panel.browserPath || projectPath);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([panel.browserPath || projectPath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showQuickLook, setShowQuickLook] = useState(false);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [homeDir, setHomeDir] = useState<string>("");

  const { gitStatus: gitStatusMap } = useGitStatus(currentPath);

  // Get home directory on mount
  useEffect(() => {
    invoke<string>("get_home_dir")
      .then(setHomeDir)
      .catch(console.error);
  }, []);

  // Load initial directory
  useEffect(() => {
    const startPath = panel.browserPath || projectPath;
    if (startPath) {
      loadDirectory(startPath);
    }
  }, []);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
    try {
      const result = await invoke<FileNode[]>("get_file_tree", {
        path,
        depth: 1,
      });
      setFiles(result);
      setCurrentPath(path);
      onPanelUpdate({ browserPath: path, title: path.split("/").pop() || "Files" });
    } catch (err) {
      console.error("Failed to load directory:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = useCallback((path: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    loadDirectory(path);
    setShowQuickLook(false);
  }, [history, historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      loadDirectory(history[newIndex]);
      setShowQuickLook(false);
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      loadDirectory(history[newIndex]);
      setShowQuickLook(false);
    }
  }, [historyIndex, history]);

  const goUp = useCallback(() => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
    if (parentPath !== currentPath) {
      navigateTo(parentPath);
    }
  }, [currentPath, navigateTo]);

  const goHome = useCallback(() => {
    if (homeDir) {
      navigateTo(homeDir);
    }
  }, [homeDir, navigateTo]);

  const handleSelect = useCallback((file: FileNode, shiftKey: boolean, ctrlKey: boolean) => {
    if (shiftKey && lastSelectedPath) {
      // Range selection
      const startIdx = files.findIndex((f) => f.path === lastSelectedPath);
      const endIdx = files.findIndex((f) => f.path === file.path);
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangePaths = files.slice(from, to + 1).map((f) => f.path);
        setSelectedPaths(new Set([...selectedPaths, ...rangePaths]));
      }
    } else if (ctrlKey) {
      // Toggle selection
      const newSelection = new Set(selectedPaths);
      if (newSelection.has(file.path)) {
        newSelection.delete(file.path);
      } else {
        newSelection.add(file.path);
      }
      setSelectedPaths(newSelection);
      setLastSelectedPath(file.path);
    } else {
      // Single selection
      setSelectedPaths(new Set([file.path]));
      setLastSelectedPath(file.path);
    }
  }, [files, lastSelectedPath, selectedPaths]);

  const handleOpen = useCallback((file: FileNode) => {
    if (file.isDirectory) {
      navigateTo(file.path);
    } else {
      // Show quick look for files
      setSelectedPaths(new Set([file.path]));
      setShowQuickLook(true);
    }
  }, [navigateTo]);

  const handleContextMenu = useCallback((_e: React.MouseEvent, _file: FileNode) => {
    // Could add context menu support later
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const selectedFile = files.find((f) => selectedPaths.has(f.path)) || null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FileBrowserHeader
        currentPath={currentPath}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < history.length - 1}
        showHiddenFiles={showHiddenFiles}
        onGoBack={goBack}
        onGoForward={goForward}
        onGoUp={goUp}
        onNavigateTo={navigateTo}
        onGoHome={goHome}
        onToggleHiddenFiles={() => setShowHiddenFiles(!showHiddenFiles)}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <FileBrowserList
            files={files}
            selectedPaths={selectedPaths}
            loading={loading}
            showHiddenFiles={showHiddenFiles}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
            onClearSelection={handleClearSelection}
            gitStatusMap={gitStatusMap}
          />
        </div>

        {showQuickLook && selectedFile && !selectedFile.isDirectory && (
          <QuickLookPreview
            file={selectedFile}
            onClose={() => setShowQuickLook(false)}
          />
        )}
      </div>
    </div>
  );
}

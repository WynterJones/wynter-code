import { useState, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { Modal } from "@/components/ui/Modal";
import { FileBrowserHeader } from "./FileBrowserHeader";
import { FileBrowserList } from "./FileBrowserList";
import { FileBrowserToolbar } from "./FileBrowserToolbar";
import { QuickLookPreview } from "./QuickLookPreview";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { FileDialog } from "./FileDialog";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useGitStatus } from "@/hooks/useGitStatus";
import { useCompression } from "@/hooks/useCompression";
import { canOptimize } from "@/types/compression";
import { Archive, FilePlus, FolderPlus, FolderOpen, Copy, Eye, ImageMinus, Pencil, Trash2, ImagePlus } from "lucide-react";
import type { FileNode } from "@/types";

export interface ImageAttachment {
  id: string;
  data: string;
  mimeType: string;
  name: string;
}

interface FileBrowserPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialPath?: string;
  mode: "selectProject" | "browse" | "selectFile";
  selectButtonLabel?: string;
  sendToPromptLabel?: string;
  overlayClassName?: string;
  onSelectProject?: (path: string) => void;
  onSelectFile?: (path: string) => void;
  onSendToPrompt?: (image: ImageAttachment) => void;
}

interface DialogState {
  type: "file" | "folder" | "rename";
  parentPath: string;
  currentName?: string;
  currentPath?: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp"];

function isImageFile(file: FileNode | null): boolean {
  if (!file || file.isDirectory) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(ext);
}

export function FileBrowserPopup({
  isOpen,
  onClose,
  initialPath,
  mode,
  selectButtonLabel,
  sendToPromptLabel,
  overlayClassName,
  onSelectProject,
  onSelectFile,
  onSendToPrompt,
}: FileBrowserPopupProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "");
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showQuickLook, setShowQuickLook] = useState(false);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [homeDir, setHomeDir] = useState<string>("");

  const { createFile, createFolder, renameItem, deleteToTrash } = useFileOperations();
  const { gitStatus: gitStatusMap, refetch: refetchGitStatus } = useGitStatus(
    isOpen ? currentPath : undefined
  );
  const { createArchive, optimizeFile } = useCompression();

  useEffect(() => {
    if (isOpen) {
      invoke<string>("get_home_dir")
        .then(setHomeDir)
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && homeDir) {
      const startPath = initialPath || homeDir;
      setCurrentPath(startPath);
      setHistory([startPath]);
      setHistoryIndex(0);
      loadDirectory(startPath);
    }
  }, [isOpen, initialPath, homeDir]);

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
    } catch (err) {
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

  // Helper to get sorted files for range selection
  const getSortedFiles = useCallback(() => {
    const filteredFiles = showHiddenFiles
      ? files
      : files.filter((f) => !f.name.startsWith("."));
    return [...filteredFiles].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files, showHiddenFiles]);

  const handleSelect = useCallback((file: FileNode, shiftKey: boolean, ctrlKey: boolean) => {
    if (shiftKey && lastSelectedPath) {
      // Range select
      const sortedFiles = getSortedFiles();
      const paths = sortedFiles.map(f => f.path);
      const startIdx = paths.indexOf(lastSelectedPath);
      const endIdx = paths.indexOf(file.path);

      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const newSelection = new Set(selectedPaths);
        for (let i = from; i <= to; i++) {
          newSelection.add(paths[i]);
        }
        setSelectedPaths(newSelection);
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
      // Single select
      setSelectedPaths(new Set([file.path]));
      setLastSelectedPath(file.path);
    }
  }, [lastSelectedPath, selectedPaths, getSortedFiles]);

  const handleClearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, []);

  const handleOpen = useCallback((file: FileNode) => {
    if (file.isDirectory) {
      navigateTo(file.path);
    } else if (mode === "selectFile" && onSelectFile) {
      onSelectFile(file.path);
      onClose();
      return;
    }
    // Clear selection when opening a file/folder
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, [navigateTo, mode, onSelectFile, onClose]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    // If right-clicking on a non-selected node, select only that node
    if (!selectedPaths.has(node.path)) {
      setSelectedPaths(new Set([node.path]));
      setLastSelectedPath(node.path);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, [selectedPaths]);

  // Get the first selected file (for single-file operations)
  const getSelectedFile = useCallback((): FileNode | null => {
    if (selectedPaths.size === 0) return null;
    const path = Array.from(selectedPaths)[0];
    return files.find(f => f.path === path) || null;
  }, [selectedPaths, files]);

  const handleCopyPath = useCallback(async () => {
    if (selectedPaths.size === 0) return;
    // Copy all selected paths, one per line
    const paths = Array.from(selectedPaths).join("\n");
    await navigator.clipboard.writeText(paths);
  }, [selectedPaths]);

  const handleSendToPrompt = useCallback(async () => {
    const selectedFile = getSelectedFile();
    if (!selectedFile || !isImageFile(selectedFile) || !onSendToPrompt) return;

    try {
      const src = convertFileSrc(selectedFile.path);
      const response = await fetch(src);
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onload = () => {
        onSendToPrompt({
          id: crypto.randomUUID(),
          data: reader.result as string,
          mimeType: blob.type,
          name: selectedFile.name,
        });
        onClose();
      };
      reader.readAsDataURL(blob);
    } catch (err) {
    }
  }, [getSelectedFile, onSendToPrompt, onClose]);

  const handleSelectProject = useCallback(() => {
    const selectedFile = getSelectedFile();
    if (selectedFile?.isDirectory && onSelectProject) {
      onSelectProject(selectedFile.path);
      onClose();
    }
  }, [getSelectedFile, onSelectProject, onClose]);

  const handleSelectFile = useCallback(() => {
    const selectedFile = getSelectedFile();
    if (selectedFile && !selectedFile.isDirectory && onSelectFile) {
      onSelectFile(selectedFile.path);
      onClose();
    }
  }, [getSelectedFile, onSelectFile, onClose]);

  const handleCreateFile = useCallback(() => {
    setDialog({ type: "file", parentPath: currentPath });
  }, [currentPath]);

  const handleCreateFolder = useCallback(() => {
    setDialog({ type: "folder", parentPath: currentPath });
  }, [currentPath]);

  const handleDialogConfirm = useCallback(async (name: string) => {
    if (!dialog) return;

    try {
      if (dialog.type === "file") {
        await createFile(dialog.parentPath, name);
      } else if (dialog.type === "folder") {
        await createFolder(dialog.parentPath, name);
      } else if (dialog.type === "rename" && dialog.currentPath) {
        await renameItem(dialog.currentPath, name);
      }
      await loadDirectory(currentPath);
      refetchGitStatus();
    } catch (err) {
    }
    setDialog(null);
  }, [dialog, currentPath, createFile, createFolder, renameItem]);

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu?.node) return [];
    const node = contextMenu.node;
    const items: ContextMenuItem[] = [];
    const hasMultipleSelection = selectedPaths.size > 1;

    if (node.isDirectory) {
      items.push(
        { label: "Open", icon: FolderOpen, action: () => navigateTo(node.path) },
        { label: "New File", icon: FilePlus, action: () => setDialog({ type: "file", parentPath: node.path }) },
        { label: "New Folder", icon: FolderPlus, action: () => setDialog({ type: "folder", parentPath: node.path }) }
      );

      if (mode === "selectProject") {
        items.push({
          label: "Open as Project",
          icon: FolderOpen,
          action: () => {
            onSelectProject?.(node.path);
            onClose();
          },
          separator: true,
        });
      }
    }

    items.push(
      {
        label: hasMultipleSelection ? `Copy ${selectedPaths.size} Paths` : "Copy Path",
        icon: Copy,
        action: () => {
          const paths = hasMultipleSelection
            ? Array.from(selectedPaths).join("\n")
            : node.path;
          navigator.clipboard.writeText(paths);
        },
        separator: !node.isDirectory,
      },
      {
        label: "Quick Look",
        icon: Eye,
        action: () => {
          setShowQuickLook(true);
        },
      }
    );

    if (isImageFile(node) && onSendToPrompt && !hasMultipleSelection) {
      items.push({
        label: sendToPromptLabel || "Send to Prompt",
        icon: ImagePlus,
        action: async () => {
          const src = convertFileSrc(node.path);
          const response = await fetch(src);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => {
            onSendToPrompt({
              id: crypto.randomUUID(),
              data: reader.result as string,
              mimeType: blob.type,
              name: node.name,
            });
            onClose();
          };
          reader.readAsDataURL(blob);
        },
      });
    }

    // Compression items - only show "Compress to Zip" for folders or multiple selections
    const pathsToCompress = hasMultipleSelection
      ? Array.from(selectedPaths)
      : [node.path];
    const showCompressOption = node.isDirectory || hasMultipleSelection;

    if (showCompressOption) {
      const label = hasMultipleSelection
        ? `Compress ${selectedPaths.size} Items to Zip`
        : "Compress to Zip";

      items.push({
        label,
        icon: Archive,
        action: async () => {
          try {
            const result = await createArchive(pathsToCompress);
            if (result.success) {
              setSelectedPaths(new Set());
              await loadDirectory(currentPath);
            }
          } catch (err) {
          }
        },
        separator: true,
      });
    }

    // Only show optimize for single selection
    if (!hasMultipleSelection && canOptimize(node.path, node.isDirectory)) {
      items.push({
        label: "Optimize File Size",
        icon: ImageMinus,
        action: async () => {
          try {
            const result = await optimizeFile(node.path);
            if (result.success) {
              await loadDirectory(currentPath);
            }
          } catch (err) {
          }
        },
      });
    }

    // Only show rename for single selection
    if (!hasMultipleSelection) {
      items.push({
        label: "Rename",
        icon: Pencil,
        action: () => setDialog({
          type: "rename",
          parentPath: currentPath,
          currentName: node.name,
          currentPath: node.path,
        }),
        separator: true,
      });
    }

    items.push({
      label: hasMultipleSelection ? `Delete ${selectedPaths.size} Items` : "Delete",
      icon: Trash2,
      action: async () => {
        for (const path of selectedPaths) {
          await deleteToTrash(path);
        }
        setSelectedPaths(new Set());
        await loadDirectory(currentPath);
        refetchGitStatus();
      },
      variant: "danger",
      separator: true,
    });

    return items;
  }, [contextMenu, selectedPaths, mode, currentPath, navigateTo, onSelectProject, onSendToPrompt, onClose, deleteToTrash, createArchive, optimizeFile, refetchGitStatus]);

  const selectPrevious = useCallback((extend: boolean = false) => {
    const sortedFiles = getSortedFiles();
    if (sortedFiles.length === 0) return;

    if (selectedPaths.size === 0) {
      const file = sortedFiles[sortedFiles.length - 1];
      setSelectedPaths(new Set([file.path]));
      setLastSelectedPath(file.path);
      return;
    }

    const currentPath = lastSelectedPath || Array.from(selectedPaths)[0];
    const currentIndex = sortedFiles.findIndex((f) => f.path === currentPath);
    if (currentIndex > 0) {
      const newFile = sortedFiles[currentIndex - 1];
      if (extend) {
        const newSelection = new Set(selectedPaths);
        newSelection.add(newFile.path);
        setSelectedPaths(newSelection);
      } else {
        setSelectedPaths(new Set([newFile.path]));
      }
      setLastSelectedPath(newFile.path);
    }
  }, [getSortedFiles, selectedPaths, lastSelectedPath]);

  const selectNext = useCallback((extend: boolean = false) => {
    const sortedFiles = getSortedFiles();
    if (sortedFiles.length === 0) return;

    if (selectedPaths.size === 0) {
      const file = sortedFiles[0];
      setSelectedPaths(new Set([file.path]));
      setLastSelectedPath(file.path);
      return;
    }

    const currentPath = lastSelectedPath || Array.from(selectedPaths)[0];
    const currentIndex = sortedFiles.findIndex((f) => f.path === currentPath);
    if (currentIndex < sortedFiles.length - 1) {
      const newFile = sortedFiles[currentIndex + 1];
      if (extend) {
        const newSelection = new Set(selectedPaths);
        newSelection.add(newFile.path);
        setSelectedPaths(newSelection);
      } else {
        setSelectedPaths(new Set([newFile.path]));
      }
      setLastSelectedPath(newFile.path);
    }
  }, [getSortedFiles, selectedPaths, lastSelectedPath]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditing = document.activeElement?.tagName === "INPUT";
      if (isEditing) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        goUp();
      }
      if (e.key === "ArrowLeft" && e.metaKey) {
        e.preventDefault();
        goBack();
      }
      if (e.key === "ArrowRight" && e.metaKey) {
        e.preventDefault();
        goForward();
      }
      if (e.key === "Enter" && selectedPaths.size > 0) {
        e.preventDefault();
        const selectedFile = getSelectedFile();
        if (selectedFile) handleOpen(selectedFile);
      }
      if (e.key === " " && selectedPaths.size > 0) {
        e.preventDefault();
        setShowQuickLook((prev) => !prev);
      }
      if ((e.key === "c" || e.key === "C") && e.metaKey && selectedPaths.size > 0) {
        e.preventDefault();
        handleCopyPath();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectPrevious(e.shiftKey);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectNext(e.shiftKey);
      }
      if (e.key === "Escape") {
        handleClearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedPaths, goUp, goBack, goForward, handleOpen, handleCopyPath, getSelectedFile, selectPrevious, selectNext, handleClearSelection]);

  const handleClose = () => {
    setShowQuickLook(false);
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
    setContextMenu(null);
    setDialog(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "selectProject" ? "Open Project" : mode === "selectFile" ? "Open File" : "Browse Files"}
      size="xl"
      className="h-[70vh] flex flex-col"
      overlayClassName={overlayClassName}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
          onToggleHiddenFiles={() => setShowHiddenFiles((prev) => !prev)}
        />

        <div className="flex-1 flex min-h-0 overflow-hidden relative">
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

          {showQuickLook && selectedPaths.size > 0 && getSelectedFile() && (
            <QuickLookPreview
              file={getSelectedFile()!}
              onClose={() => setShowQuickLook(false)}
            />
          )}
        </div>

        <FileBrowserToolbar
          selectedFile={getSelectedFile()}
          selectedCount={selectedPaths.size}
          mode={mode}
          showQuickLook={showQuickLook}
          selectButtonLabel={selectButtonLabel}
          sendToPromptLabel={sendToPromptLabel}
          onCopyPath={handleCopyPath}
          onToggleQuickLook={() => setShowQuickLook((prev) => !prev)}
          onSendToPrompt={handleSendToPrompt}
          onSelectProject={handleSelectProject}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
        />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {dialog && (
        <FileDialog
          type={dialog.type}
          initialValue={dialog.currentName || ""}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </Modal>
  );
}

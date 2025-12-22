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
import { FilePlus, FolderPlus, FolderOpen, Copy, Eye, Pencil, Trash2, ImagePlus } from "lucide-react";
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
  mode: "selectProject" | "browse";
  selectButtonLabel?: string;
  onSelectProject?: (path: string) => void;
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
  onSelectProject,
  onSendToPrompt,
}: FileBrowserPopupProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "");
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
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

  useEffect(() => {
    if (isOpen) {
      invoke<string>("get_home_dir")
        .then(setHomeDir)
        .catch(console.error);
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
    setSelectedFile(null);
    try {
      const result = await invoke<FileNode[]>("get_file_tree", {
        path,
        depth: 1,
      });
      setFiles(result);
      setCurrentPath(path);
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

  const handleSelect = useCallback((file: FileNode) => {
    setSelectedFile(file);
  }, []);

  const handleOpen = useCallback((file: FileNode) => {
    if (file.isDirectory) {
      navigateTo(file.path);
    }
  }, [navigateTo]);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
    setSelectedFile(node);
  }, []);

  const handleCopyPath = useCallback(async () => {
    if (selectedFile) {
      await navigator.clipboard.writeText(selectedFile.path);
    }
  }, [selectedFile]);

  const handleSendToPrompt = useCallback(async () => {
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
      console.error("Failed to read image:", err);
    }
  }, [selectedFile, onSendToPrompt, onClose]);

  const handleSelectProject = useCallback(() => {
    if (selectedFile?.isDirectory && onSelectProject) {
      onSelectProject(selectedFile.path);
      onClose();
    }
  }, [selectedFile, onSelectProject, onClose]);

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
      console.error("File operation failed:", err);
    }
    setDialog(null);
  }, [dialog, currentPath, createFile, createFolder, renameItem]);

  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu?.node) return [];
    const node = contextMenu.node;
    const items: ContextMenuItem[] = [];

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
        label: "Copy Path",
        icon: Copy,
        action: () => navigator.clipboard.writeText(node.path),
        separator: !node.isDirectory,
      },
      {
        label: "Quick Look",
        icon: Eye,
        action: () => {
          setSelectedFile(node);
          setShowQuickLook(true);
        },
      }
    );

    if (isImageFile(node) && onSendToPrompt) {
      items.push({
        label: "Send to Prompt",
        icon: ImagePlus,
        action: async () => {
          setSelectedFile(node);
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

    items.push(
      {
        label: "Rename",
        icon: Pencil,
        action: () => setDialog({
          type: "rename",
          parentPath: currentPath,
          currentName: node.name,
          currentPath: node.path,
        }),
        separator: true,
      },
      {
        label: "Delete",
        icon: Trash2,
        action: async () => {
          await deleteToTrash(node.path);
          await loadDirectory(currentPath);
          refetchGitStatus();
        },
        variant: "danger",
        separator: true,
      }
    );

    return items;
  }, [contextMenu, mode, currentPath, navigateTo, onSelectProject, onSendToPrompt, onClose, deleteToTrash]);

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
      if (e.key === "Enter" && selectedFile) {
        e.preventDefault();
        handleOpen(selectedFile);
      }
      if (e.key === " " && selectedFile) {
        e.preventDefault();
        setShowQuickLook((prev) => !prev);
      }
      if ((e.key === "c" || e.key === "C") && e.metaKey && selectedFile) {
        e.preventDefault();
        handleCopyPath();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectPrevious();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedFile, goUp, goBack, goForward, handleOpen, handleCopyPath]);

  const selectPrevious = () => {
    const filteredFiles = showHiddenFiles
      ? files
      : files.filter((f) => !f.name.startsWith("."));
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!selectedFile) {
      setSelectedFile(sortedFiles[sortedFiles.length - 1] || null);
      return;
    }

    const currentIndex = sortedFiles.findIndex((f) => f.path === selectedFile.path);
    if (currentIndex > 0) {
      setSelectedFile(sortedFiles[currentIndex - 1]);
    }
  };

  const selectNext = () => {
    const filteredFiles = showHiddenFiles
      ? files
      : files.filter((f) => !f.name.startsWith("."));
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!selectedFile) {
      setSelectedFile(sortedFiles[0] || null);
      return;
    }

    const currentIndex = sortedFiles.findIndex((f) => f.path === selectedFile.path);
    if (currentIndex < sortedFiles.length - 1) {
      setSelectedFile(sortedFiles[currentIndex + 1]);
    }
  };

  const handleClose = () => {
    setShowQuickLook(false);
    setSelectedFile(null);
    setContextMenu(null);
    setDialog(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "selectProject" ? "Open Project" : "Browse Files"}
      size="xl"
      className="h-[70vh] flex flex-col"
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
            selectedFile={selectedFile}
            loading={loading}
            showHiddenFiles={showHiddenFiles}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onContextMenu={handleContextMenu}
            gitStatusMap={gitStatusMap}
          />

          {showQuickLook && selectedFile && (
            <QuickLookPreview
              file={selectedFile}
              onClose={() => setShowQuickLook(false)}
            />
          )}
        </div>

        <FileBrowserToolbar
          selectedFile={selectedFile}
          mode={mode}
          showQuickLook={showQuickLook}
          selectButtonLabel={selectButtonLabel}
          onCopyPath={handleCopyPath}
          onToggleQuickLook={() => setShowQuickLook((prev) => !prev)}
          onSendToPrompt={handleSendToPrompt}
          onSelectProject={handleSelectProject}
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

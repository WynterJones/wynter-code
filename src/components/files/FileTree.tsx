import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ScrollArea } from "@/components/ui";
import { FileTreeNode } from "./FileTreeNode";
import { FileTreeToolbar } from "./FileTreeToolbar";
import { ContextMenu, buildFileContextMenuItems, buildCompressionMenuItems } from "./ContextMenu";
import { FileDialog } from "./FileDialog";
import { ImageOptimizePopup } from "./ImageOptimizePopup";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useGitStatus } from "@/hooks/useGitStatus";
import { useCompression } from "@/hooks/useCompression";
import { useDragStore } from "@/stores/dragStore";
import { formatBytes } from "@/lib/storageUtils";
import { OPTIMIZABLE_IMAGE_EXTENSIONS } from "@/types/compression";
import type { FileNode } from "@/types";

interface FileTreeProps {
  projectPath: string;
  onFileOpen?: (path: string) => void;
  onNodeModulesClick?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

interface DialogState {
  type: "file" | "folder" | "rename";
  parentPath: string;
  currentName?: string;
  currentPath?: string;
}

export function FileTree({ projectPath, onFileOpen, onNodeModulesClick }: FileTreeProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);
  const [optimizePopupPath, setOptimizePopupPath] = useState<string | null>(null);

  const { createFile, createFolder, renameItem, deleteToTrash, moveItem } = useFileOperations();
  const { gitStatus: gitStatusMap, refetch: refetchGitStatus } = useGitStatus(projectPath);
  const { createArchive, optimizePdf, optimizeVideo } = useCompression();
  const cancelDrag = useDragStore((s) => s.cancelDrag);
  const isRefreshing = useRef(false);

  // Global mouseup handler to cancel any incomplete drag operations
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // Small delay to allow drop handlers to run first
      setTimeout(() => {
        cancelDrag();
      }, 100);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [cancelDrag]);

  // Refresh contents of expanded folders without collapsing them
  const refreshExpandedFolders = useCallback(async (expandedPaths: Set<string>) => {
    for (const folderPath of expandedPaths) {
      try {
        const children = await invoke<FileNode[]>("get_file_tree", {
          path: folderPath,
          depth: 1,
        });
        setFiles((prev) => {
          const node = findNodeByPath(prev, folderPath);
          if (node && node.isExpanded) {
            // Merge new children while preserving nested expanded state
            const nestedExpanded = node.children
              ? collectExpandedPaths(node.children)
              : new Set<string>();
            const mergedChildren = nestedExpanded.size > 0 && node.children
              ? mergeTreeState(children, node.children, nestedExpanded)
              : children;
            return updateNodeInTree(prev, folderPath, {
              ...node,
              children: mergedChildren,
            });
          }
          return prev;
        });
      } catch {
        // Folder may have been deleted, ignore
      }
    }
  }, []);

  const loadFiles = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const result = await invoke<FileNode[]>("get_file_tree", {
        path: projectPath,
        depth: 1,
      });

      if (silent) {
        // Preserve expanded folder state during silent refreshes
        setFiles((prevFiles) => {
          const expandedPaths = collectExpandedPaths(prevFiles);
          if (expandedPaths.size === 0) {
            return result;
          }
          // Also trigger async refresh of expanded folders in background
          if (expandedPaths.size > 0) {
            refreshExpandedFolders(expandedPaths);
          }
          return mergeTreeState(result, prevFiles, expandedPaths);
        });
      } else {
        setFiles(result);
      }

      if (!silent) {
        setError(null);
      }
    } catch (err) {
      if (!silent) {
        setError(err as string);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [projectPath, refreshExpandedFolders]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Listen for internal folder drops from drag coordinator
  useEffect(() => {
    const handleInternalFolderDrop = async (e: CustomEvent<{
      files: Array<{ path: string; name: string; isDirectory: boolean }>;
      targetFolder: string;
    }>) => {
      const { files: droppedFiles, targetFolder } = e.detail;
      if (!droppedFiles || droppedFiles.length === 0 || !targetFolder) return;

      // Validate drops - filter out invalid moves
      const validFiles = droppedFiles.filter(f => {
        // Not dropping on itself
        if (f.path === targetFolder) return false;
        // Not dropping folder into its own child
        if (f.isDirectory && targetFolder.startsWith(f.path + "/")) return false;
        // Not dropping into same parent
        const parentPath = f.path.substring(0, f.path.lastIndexOf("/"));
        if (parentPath === targetFolder) return false;
        return true;
      });

      if (validFiles.length === 0) return;

      try {
        // Move items sequentially to avoid race conditions
        for (const file of validFiles) {
          await moveItem(file.path, targetFolder);
        }
        await loadFiles(true);
        refetchGitStatus();
        setSelectedPaths(new Set());
      } catch (err) {
        console.error("Failed to move items:", err);
      }
    };

    window.addEventListener("internal-folder-drop", handleInternalFolderDrop as unknown as EventListener);
    return () => window.removeEventListener("internal-folder-drop", handleInternalFolderDrop as unknown as EventListener);
  }, [moveItem, loadFiles, refetchGitStatus]);

  // File watcher for auto-refresh
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupWatcher = async () => {
      try {
        // Start the file watcher
        await invoke("start_file_watcher", { path: projectPath });

        // Listen for file system change events
        unlisten = await listen<{ watchPath: string; changedPaths: string[] }>(
          "fs-change",
          async (event) => {
            // Only respond to events for our watched path
            if (event.payload.watchPath !== projectPath) return;

            // Prevent multiple refreshes at once
            if (isRefreshing.current) return;
            isRefreshing.current = true;

            try {
              await loadFiles(true); // Silent refresh - no loading indicator
              refetchGitStatus();
            } finally {
              // Small delay before allowing another refresh
              setTimeout(() => {
                isRefreshing.current = false;
              }, 100);
            }
          }
        );
      } catch (err) {
        console.error("Failed to setup file watcher:", err);
      }
    };

    setupWatcher();

    return () => {
      // Cleanup: stop watcher and unlisten
      if (unlisten) {
        unlisten();
      }
      invoke("stop_file_watcher", { path: projectPath }).catch(console.error);
    };
  }, [projectPath, loadFiles, refetchGitStatus]);

  const handleToggle = async (node: FileNode) => {
    if (!node.isDirectory) return;

    if (node.isExpanded) {
      setFiles((prev) =>
        updateNodeInTree(prev, node.path, { ...node, isExpanded: false, children: undefined })
      );
    } else {
      try {
        const children = await invoke<FileNode[]>("get_file_tree", {
          path: node.path,
          depth: 1,
        });
        setFiles((prev) =>
          updateNodeInTree(prev, node.path, { ...node, isExpanded: true, children })
        );
      } catch (err) {
        console.error("Failed to load directory:", err);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    // If right-clicking on a non-selected node, select only that node
    if (!selectedPaths.has(node.path)) {
      setSelectedPaths(new Set([node.path]));
      setLastSelectedPath(node.path);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  // Collect all visible paths in order for shift-select
  const collectVisiblePaths = useCallback((nodes: FileNode[]): string[] => {
    const paths: string[] = [];
    const traverse = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        paths.push(node.path);
        if (node.isDirectory && node.isExpanded && node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return paths;
  }, []);

  const handleSelect = useCallback((node: FileNode, shiftKey: boolean) => {
    if (shiftKey && lastSelectedPath) {
      // Range select
      const visiblePaths = collectVisiblePaths(files);
      const startIdx = visiblePaths.indexOf(lastSelectedPath);
      const endIdx = visiblePaths.indexOf(node.path);

      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const newSelection = new Set(selectedPaths);
        for (let i = from; i <= to; i++) {
          newSelection.add(visiblePaths[i]);
        }
        setSelectedPaths(newSelection);
      }
    } else {
      // Toggle single selection (Cmd/Ctrl click)
      const newSelection = new Set(selectedPaths);
      if (newSelection.has(node.path)) {
        newSelection.delete(node.path);
      } else {
        newSelection.add(node.path);
      }
      setSelectedPaths(newSelection);
      setLastSelectedPath(node.path);
    }
  }, [lastSelectedPath, selectedPaths, files, collectVisiblePaths]);

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleCreateFile = (parentPath: string = projectPath) => {
    setDialog({ type: "file", parentPath });
  };

  const handleCreateFolder = (parentPath: string = projectPath) => {
    setDialog({ type: "folder", parentPath });
  };

  const handleRename = (node: FileNode) => {
    setDialog({
      type: "rename",
      parentPath: node.path,
      currentName: node.name,
      currentPath: node.path,
    });
  };

  const handleDelete = async (node: FileNode) => {
    try {
      await deleteToTrash(node.path);
      await loadFiles(true);
      refetchGitStatus();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleMoveItem = async (sourcePath: string, destinationFolder: string) => {
    try {
      await moveItem(sourcePath, destinationFolder);
      await loadFiles(true);
      refetchGitStatus();
      setSelectedPaths(new Set());
    } catch (err) {
      console.error("Failed to move item:", err);
    }
  };

  const handleMoveItems = async (sourcePaths: string[], destinationFolder: string) => {
    try {
      // Move items sequentially to avoid race conditions
      for (const sourcePath of sourcePaths) {
        await moveItem(sourcePath, destinationFolder);
      }
      await loadFiles(true);
      refetchGitStatus();
      setSelectedPaths(new Set());
    } catch (err) {
      console.error("Failed to move items:", err);
    }
  };

  const handleCreateArchive = async (paths: string[]) => {
    try {
      const result = await createArchive(paths);
      if (result.success) {
        const savings = result.savingsPercent.toFixed(1);
        console.log(
          `Created ${result.outputPath}: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savings}% saved)`
        );
        setSelectedPaths(new Set());
        await loadFiles(true);
      }
    } catch (err) {
      console.error("Failed to create archive:", err);
    }
  };

  const handleOptimizeFile = async (node: FileNode) => {
    const ext = node.path.split(".").pop()?.toLowerCase() || "";

    // For images, open the optimization popup
    if (OPTIMIZABLE_IMAGE_EXTENSIONS.includes(ext)) {
      setOptimizePopupPath(node.path);
      return;
    }

    // For PDFs and videos, use direct optimization
    try {
      let result;
      if (ext === "pdf") {
        result = await optimizePdf(node.path);
      } else {
        result = await optimizeVideo(node.path);
      }

      if (result.success) {
        const savings = result.savingsPercent.toFixed(1);
        console.log(
          `Optimized ${result.outputPath}: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savings}% saved)`
        );
        await loadFiles(true);
      }
    } catch (err) {
      console.error("Failed to optimize file:", err);
    }
  };

  const handleDialogConfirm = async (name: string) => {
    if (!dialog) return;

    try {
      if (dialog.type === "rename" && dialog.currentPath) {
        await renameItem(dialog.currentPath, name);
      } else if (dialog.type === "file") {
        await createFile(dialog.parentPath, name);
      } else if (dialog.type === "folder") {
        await createFolder(dialog.parentPath, name);
      }
      await loadFiles(true);
      refetchGitStatus();
    } catch (err) {
      console.error("File operation failed:", err);
    }

    setDialog(null);
  };

  const handleDialogCancel = () => {
    setDialog(null);
  };

  // Build context menu items based on the selected node
  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    const { node } = contextMenu;
    const hasMultipleSelection = selectedPaths.size > 1;

    const baseItems = buildFileContextMenuItems(
      node.isDirectory,
      () => handleCreateFile(node.path),
      () => handleCreateFolder(node.path),
      () => handleRename(node),
      () => handleDelete(node)
    );

    // Determine paths for compression
    const pathsToCompress = hasMultipleSelection
      ? Array.from(selectedPaths)
      : [node.path];

    // Only show compress option for folders or multiple selection
    const showCompressOption = node.isDirectory || hasMultipleSelection;

    const compressionItems = buildCompressionMenuItems(
      node.path,
      node.isDirectory,
      () => handleCreateArchive(pathsToCompress),
      () => handleOptimizeFile(node),
      showCompressOption,
      hasMultipleSelection ? selectedPaths.size : undefined
    );

    // Insert compression items before delete (last item)
    const deleteItem = baseItems.pop()!;
    return [...baseItems, ...compressionItems, deleteItem];
  };

  if (loading) {
    return (
      <div className="relative flex flex-col h-full">
        <div className="p-4 text-text-secondary text-sm">
          Loading files...
        </div>
        <FileTreeToolbar
          onCreateFile={() => handleCreateFile()}
          onCreateFolder={() => handleCreateFolder()}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col h-full">
        <div className="p-4 text-accent-red text-sm">
          Error: {error}
        </div>
        <FileTreeToolbar
          onCreateFile={() => handleCreateFile()}
          onCreateFolder={() => handleCreateFolder()}
        />
      </div>
    );
  }

  const handleClearSelection = () => {
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking on the container itself, not on a file item
    if (e.target === e.currentTarget) {
      handleClearSelection();
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div
          className="py-2 min-h-full"
          onClick={handleContainerClick}
          data-folder="true"
          data-path={projectPath}
        >
          {files.filter((f) => f.name !== ".DS_Store").map((file) => (
            <FileTreeNode
              key={file.path}
              node={file}
              depth={0}
              onToggle={handleToggle}
              onFileOpen={onFileOpen}
              onContextMenu={handleContextMenu}
              onNodeModulesClick={onNodeModulesClick}
              onMoveItem={handleMoveItem}
              onMoveItems={handleMoveItems}
              gitStatusMap={gitStatusMap}
              selectedPaths={selectedPaths}
              onSelect={handleSelect}
              allNodes={files}
            />
          ))}
        </div>
      </ScrollArea>

      <FileTreeToolbar
        onCreateFile={() => handleCreateFile()}
        onCreateFolder={() => handleCreateFolder()}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={closeContextMenu}
        />
      )}

      {dialog && (
        <FileDialog
          type={dialog.type}
          initialValue={dialog.currentName}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      {optimizePopupPath && (
        <ImageOptimizePopup
          isOpen={!!optimizePopupPath}
          onClose={() => setOptimizePopupPath(null)}
          filePath={optimizePopupPath}
          onOptimized={() => loadFiles(true)}
        />
      )}
    </div>
  );
}

function updateNodeInTree(
  nodes: FileNode[],
  targetPath: string,
  newNode: FileNode
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return newNode;
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetPath, newNode),
      };
    }
    return node;
  });
}

function findNodeByPath(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Collects all expanded folder paths from a tree
 */
function collectExpandedPaths(nodes: FileNode[]): Set<string> {
  const expanded = new Set<string>();

  function traverse(nodeList: FileNode[]) {
    for (const node of nodeList) {
      if (node.isDirectory && node.isExpanded) {
        expanded.add(node.path);
        if (node.children) {
          traverse(node.children);
        }
      }
    }
  }

  traverse(nodes);
  return expanded;
}

/**
 * Merges new tree data with old tree, preserving expanded state and children
 * for folders that were previously expanded
 */
function mergeTreeState(
  newNodes: FileNode[],
  oldNodes: FileNode[],
  expandedPaths: Set<string>
): FileNode[] {
  const oldNodeMap = new Map<string, FileNode>();
  for (const node of oldNodes) {
    oldNodeMap.set(node.path, node);
  }

  return newNodes.map((newNode) => {
    const oldNode = oldNodeMap.get(newNode.path);

    if (newNode.isDirectory && oldNode?.isDirectory && expandedPaths.has(newNode.path)) {
      // Preserve expanded state and children for previously expanded folders
      return {
        ...newNode,
        isExpanded: true,
        children: oldNode.children
          ? mergeTreeState(
              oldNode.children, // Keep old children structure
              oldNode.children,
              expandedPaths
            )
          : undefined,
      };
    }

    return newNode;
  });
}

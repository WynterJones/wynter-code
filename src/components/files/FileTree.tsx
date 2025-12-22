import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ScrollArea } from "@/components/ui";
import { FileTreeNode } from "./FileTreeNode";
import { FileTreeToolbar } from "./FileTreeToolbar";
import { ContextMenu, buildFileContextMenuItems } from "./ContextMenu";
import { FileDialog } from "./FileDialog";
import { useFileOperations } from "@/hooks/useFileOperations";
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

  const { createFile, createFolder, renameItem, deleteToTrash, moveItem } = useFileOperations();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<FileNode[]>("get_file_tree", {
        path: projectPath,
        depth: 1,
      });
      setFiles(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

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
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

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
      await loadFiles();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleMoveItem = async (sourcePath: string, destinationFolder: string) => {
    try {
      await moveItem(sourcePath, destinationFolder);
      await loadFiles();
    } catch (err) {
      console.error("Failed to move item:", err);
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
      await loadFiles();
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

    return buildFileContextMenuItems(
      node.isDirectory,
      () => handleCreateFile(node.path),
      () => handleCreateFolder(node.path),
      () => handleRename(node),
      () => handleDelete(node)
    );
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

  return (
    <div className="relative flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="py-2">
          {files.map((file) => (
            <FileTreeNode
              key={file.path}
              node={file}
              depth={0}
              onToggle={handleToggle}
              onFileOpen={onFileOpen}
              onContextMenu={handleContextMenu}
              onNodeModulesClick={onNodeModulesClick}
              onMoveItem={handleMoveItem}
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

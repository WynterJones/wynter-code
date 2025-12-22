import { useState, useEffect } from "react";
import {
  RefreshCw,
  Trash2,
  FolderOpen,
  AlertCircle,
  Package,
  CheckSquare,
  Square,
  HardDrive,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Tooltip, Modal, Button } from "@/components/ui";
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";
import { cn } from "@/lib/utils";

interface NodeModulesFolder {
  path: string;
  projectPath: string;
  projectName: string;
  size: number;
  formattedSize: string;
  lastModified: number;
  lastModifiedFormatted: string;
}

interface ScanResult {
  folders: NodeModulesFolder[];
  totalSize: number;
  totalSizeFormatted: string;
}

interface DeleteResult {
  deletedCount: number;
  failedCount: number;
  spaceRecovered: number;
  spaceRecoveredFormatted: string;
  failedPaths: string[];
}

interface NodeModulesCleanerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NodeModulesCleanerPopup({
  isOpen,
  onClose,
}: NodeModulesCleanerPopupProps) {
  const [folders, setFolders] = useState<NodeModulesFolder[]>([]);
  const [scanPath, setScanPath] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [homeDir, setHomeDir] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      invoke<string>("get_home_dir").then(setHomeDir).catch(console.error);
    }
  }, [isOpen]);

  const handleSelectFolder = (path: string) => {
    setScanPath(path);
    setError(null);
    setFolders([]);
    setSelectedPaths(new Set());
    setDeleteResult(null);
    setShowFileBrowser(false);
    handleScan(path);
  };

  const handleScan = async (path: string) => {
    setScanning(true);
    setError(null);
    try {
      const result = await invoke<ScanResult>("scan_node_modules", {
        scanPath: path,
      });
      setFolders(result.folders);
    } catch (err) {
      setError(err as string);
      setFolders([]);
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPaths.size === folders.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(folders.map((f) => f.path)));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const result = await invoke<DeleteResult>("delete_node_modules", {
        paths: Array.from(selectedPaths),
      });
      setDeleteResult(result);
      setSelectedPaths(new Set());
      setShowConfirm(false);

      if (scanPath) {
        await handleScan(scanPath);
      }
    } catch (err) {
      setError(`Delete failed: ${err}`);
    } finally {
      setDeleting(false);
    }
  };

  const selectedSize = folders
    .filter((f) => selectedPaths.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  const formatSize = (bytes: number): string => {
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes >= GB) {
      return `${(bytes / GB).toFixed(1)} GB`;
    } else if (bytes >= MB) {
      return `${(bytes / MB).toFixed(1)} MB`;
    } else if (bytes >= KB) {
      return `${(bytes / KB).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const shortenPath = (path: string): string => {
    const home = path.match(/^\/Users\/[^/]+/)?.[0];
    if (home) {
      return path.replace(home, "~");
    }
    return path;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Node Modules Cleaner"
      size="lg"
    >
      <div className="flex flex-col h-[550px] p-4">
        {/* Folder Picker */}
        <div className="flex items-center gap-3 pb-3 mb-3 border-b border-border">
          <Button
            onClick={() => setShowFileBrowser(true)}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Select Folder
          </Button>
          {scanPath && (
            <span className="text-sm text-text-secondary truncate flex-1">
              {shortenPath(scanPath)}
            </span>
          )}
          {scanPath && (
            <Tooltip content="Rescan">
              <IconButton
                size="sm"
                onClick={() => handleScan(scanPath)}
                disabled={scanning}
              >
                <RefreshCw
                  className={cn("w-4 h-4", scanning && "animate-spin")}
                />
              </IconButton>
            </Tooltip>
          )}
        </div>

        {/* Delete Result Banner */}
        {deleteResult && deleteResult.deletedCount > 0 && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
            <HardDrive className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              Deleted {deleteResult.deletedCount} folder
              {deleteResult.deletedCount !== 1 ? "s" : ""}, recovered{" "}
              {deleteResult.spaceRecoveredFormatted}
            </span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Header with Select All */}
        {folders.length > 0 && (
          <div className="flex items-center justify-between pb-2 mb-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {selectedPaths.size === folders.length ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Select All
            </button>
            <span className="text-sm text-text-secondary">
              {folders.length} folder{folders.length !== 1 ? "s" : ""} found
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {scanning ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Scanning for node_modules...
            </div>
          ) : !scanPath ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Package className="w-8 h-8 mb-2 opacity-50" />
              <p>Select a folder to scan for node_modules</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
              <Package className="w-8 h-8 mb-2 opacity-50" />
              <p>No node_modules folders found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  onClick={() => handleToggleSelect(folder.path)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedPaths.has(folder.path)
                      ? "bg-accent/10 border-accent/30"
                      : "bg-bg-tertiary/50 border-border hover:border-border-hover",
                  )}
                >
                  <div className="flex-shrink-0">
                    {selectedPaths.has(folder.path) ? (
                      <CheckSquare className="w-5 h-5 text-accent" />
                    ) : (
                      <Square className="w-5 h-5 text-text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">
                        {folder.projectName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono">
                        {folder.formattedSize}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-secondary truncate">
                        {shortenPath(folder.path)}
                      </span>
                      <span className="text-[10px] text-text-secondary/50">
                        {folder.lastModifiedFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Delete Button */}
        {folders.length > 0 && (
          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {selectedPaths.size > 0 && (
                <span>
                  Recover:{" "}
                  <span className="text-accent font-medium">
                    {formatSize(selectedSize)}
                  </span>
                </span>
              )}
            </div>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={selectedPaths.size === 0 || deleting}
              className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            >
              {deleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Selected ({selectedPaths.size})
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="bg-bg-secondary border border-border rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Are you sure you want to delete {selectedPaths.size}{" "}
                node_modules folder{selectedPaths.size !== 1 ? "s" : ""}? This
                will free up{" "}
                <span className="text-accent font-medium">
                  {formatSize(selectedSize)}
                </span>{" "}
                of disk space.
              </p>
              <p className="text-xs text-red-400 mb-4">
                This action cannot be undone. You will need to run npm install
                to restore dependencies.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="bg-bg-tertiary hover:bg-bg-hover"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Browser for folder selection */}
      <FileBrowserPopup
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        initialPath={homeDir}
        mode="selectProject"
        selectButtonLabel="Select Folder"
        onSelectProject={handleSelectFolder}
      />
    </Modal>
  );
}

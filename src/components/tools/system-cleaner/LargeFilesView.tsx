import { useState, useEffect } from "react";
import {
  RefreshCw,
  Trash2,
  FileSearch,
  CheckSquare,
  Square,
  AlertCircle,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/lib/utils";
import { useSystemCleanerStore } from "@/stores/systemCleanerStore";
import { ItemRow } from "./ItemRow";
import type { LargeFileThreshold } from "@/types/systemCleaner";

const THRESHOLDS: { value: LargeFileThreshold; label: string }[] = [
  { value: 50, label: "50+ MB" },
  { value: 100, label: "100+ MB" },
  { value: 500, label: "500+ MB" },
  { value: 1000, label: "1+ GB" },
];

function formatSize(bytes: number): string {
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
}

export function LargeFilesView() {
  const {
    largeFiles,
    largeFilesTotalSize,
    largeFileThreshold,
    setLargeFileThreshold,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedSize,
    scanLargeFiles,
    deleteSelected,
    isScanning,
    isDeleting,
    error,
    clearError,
  } = useSystemCleanerStore();

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    count: number;
    size: string;
  } | null>(null);

  // Scan on mount
  useEffect(() => {
    if (largeFiles.length === 0) {
      scanLargeFiles();
    }
  }, []);

  const selectedCount = Array.from(selectedItems).filter((id) =>
    largeFiles.some((f) => f.id === id)
  ).length;

  const selectedSize = getSelectedSize();
  const allSelected = largeFiles.length > 0 && selectedCount === largeFiles.length;

  const handleDelete = async () => {
    const result = await deleteSelected();
    if (result) {
      setDeleteResult({
        count: result.deletedCount,
        size: result.spaceRecoveredFormatted,
      });
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <FileSearch className="w-5 h-5 text-accent" />
          <div>
            <h2 className="font-medium text-text-primary">Large Files</h2>
            <p className="text-xs text-text-secondary">
              {largeFiles.length} files &middot; {formatSize(largeFilesTotalSize)} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={largeFileThreshold}
            onChange={(e) =>
              setLargeFileThreshold(Number(e.target.value) as LargeFileThreshold)
            }
            className="px-2 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary"
          >
            {THRESHOLDS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <Button
            onClick={() => scanLargeFiles()}
            disabled={isScanning}
            size="sm"
            variant="secondary"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isScanning && "animate-spin")} />
            Scan
          </Button>
        </div>
      </div>

      {/* Delete Result Banner */}
      {deleteResult && (
        <div className="flex items-center gap-2 mx-4 mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          <HardDrive className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm flex-1">
            Moved {deleteResult.count} file{deleteResult.count !== 1 ? "s" : ""} to
            Trash, recovered {deleteResult.size}
          </span>
          <button
            onClick={() => setDeleteResult(null)}
            className="text-green-400/70 hover:text-green-400"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 mx-4 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400/70 hover:text-red-400"
          >
            &times;
          </button>
        </div>
      )}

      {/* Select All Header */}
      {largeFiles.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-accent" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select All
          </button>
          {selectedCount > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 px-4" scrollbarVisibility="visible">
        {isScanning ? (
          <div className="flex items-center justify-center h-32 text-text-secondary">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Scanning for large files...
          </div>
        ) : largeFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <FileSearch className="w-8 h-8 mb-2 opacity-50" />
            <p>No large files found above {largeFileThreshold}MB</p>
            <p className="text-xs text-text-tertiary mt-1">
              Try lowering the threshold or scan again
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {largeFiles.map((file) => (
              <ItemRow
                key={file.id}
                name={file.name}
                path={file.path}
                size={file.formattedSize}
                lastModified={file.lastModifiedFormatted}
                description={file.description}
                selected={selectedItems.has(file.id)}
                onToggle={() => toggleSelection(file.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {largeFiles.length > 0 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {selectedCount > 0 && (
              <span>
                Selected: <span className="text-accent font-medium">{formatSize(selectedSize)}</span>
              </span>
            )}
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={selectedCount === 0 || isDeleting}
            variant="danger"
          >
            {isDeleting ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1.5" />
            )}
            Move to Trash ({selectedCount})
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10">
          <div className="bg-bg-secondary border border-border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to move {selectedCount} file
              {selectedCount !== 1 ? "s" : ""} to Trash? This will free up{" "}
              <span className="text-accent font-medium">{formatSize(selectedSize)}</span>{" "}
              of disk space.
            </p>
            <p className="text-xs text-text-tertiary mb-4">
              Files can be recovered from Trash if needed.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="danger"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

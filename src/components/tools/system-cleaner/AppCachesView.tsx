import { useState, useEffect } from "react";
import {
  RefreshCw,
  Trash2,
  Archive,
  CheckSquare,
  Square,
  AlertCircle,
  HardDrive,
  Globe,
  Code,
  Cpu,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/lib/utils";
import { useSystemCleanerStore } from "@/stores/systemCleanerStore";
import { ItemRow } from "./ItemRow";

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  browser: Globe,
  dev: Code,
  system: Cpu,
  app: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  browser: "Browser Caches",
  dev: "Developer Tools",
  system: "System Caches",
  app: "Application Caches",
};

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

export function AppCachesView() {
  const {
    appCaches,
    appCachesTotalSize,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedSize,
    scanAppCaches,
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
    if (appCaches.length === 0) {
      scanAppCaches();
    }
  }, []);

  const selectedCount = Array.from(selectedItems).filter((id) =>
    appCaches.some((c) => c.id === id)
  ).length;

  const selectedSize = getSelectedSize();
  const allSelected = appCaches.length > 0 && selectedCount === appCaches.length;

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

  // Group caches by category
  const groupedCaches = appCaches.reduce(
    (acc, cache) => {
      const category = cache.itemType || "system";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(cache);
      return acc;
    },
    {} as Record<string, typeof appCaches>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-accent" />
          <div>
            <h2 className="font-medium text-text-primary">App Caches</h2>
            <p className="text-xs text-text-secondary">
              {appCaches.length} caches &middot; {formatSize(appCachesTotalSize)} total
            </p>
          </div>
        </div>

        <Button
          onClick={() => scanAppCaches()}
          disabled={isScanning}
          size="sm"
          variant="secondary"
        >
          <RefreshCw className={cn("w-4 h-4 mr-1.5", isScanning && "animate-spin")} />
          Scan
        </Button>
      </div>

      {/* Delete Result Banner */}
      {deleteResult && (
        <div className="flex items-center gap-2 mx-4 mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          <HardDrive className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm flex-1">
            Moved {deleteResult.count} cache{deleteResult.count !== 1 ? "s" : ""} to
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
      {appCaches.length > 0 && (
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
            Scanning app caches...
          </div>
        ) : appCaches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <Archive className="w-8 h-8 mb-2 opacity-50" />
            <p>No app caches found</p>
            <p className="text-xs text-text-tertiary mt-1">
              Your system is already clean!
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {Object.entries(groupedCaches).map(([category, caches]) => {
              const Icon = CATEGORY_ICONS[category] || Package;
              const label = CATEGORY_LABELS[category] || category;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-text-tertiary" />
                    <h3 className="text-sm font-medium text-text-secondary">
                      {label}
                    </h3>
                    <span className="text-xs text-text-tertiary">
                      ({caches.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {caches.map((cache) => (
                      <ItemRow
                        key={cache.id}
                        name={cache.name}
                        path={cache.path}
                        size={cache.formattedSize}
                        lastModified={cache.lastModifiedFormatted}
                        selected={selectedItems.has(cache.id)}
                        onToggle={() => toggleSelection(cache.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {appCaches.length > 0 && (
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
              Are you sure you want to clear {selectedCount} cache
              {selectedCount !== 1 ? "s" : ""}? This will free up{" "}
              <span className="text-accent font-medium">{formatSize(selectedSize)}</span>{" "}
              of disk space.
            </p>
            <p className="text-xs text-amber-400 mb-4">
              Note: Some apps may need to rebuild their caches, which could
              temporarily slow them down.
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
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Caches
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

import { useState, useMemo, useCallback, useRef } from "react";
import { Download, Trash2, AlertTriangle, HardDrive, Shield, Upload, CheckCircle2, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DATA_CATEGORIES,
  getCategorySize,
  getTotalStorageSize,
  formatBytes,
  getCategoryData,
  exportToJson,
  clearStorageKeys,
  type DataCategory,
} from "@/lib/storageUtils";

// Store imports for reset functionality
import { useSessionStore } from "@/stores/sessionStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useApiTesterStore } from "@/stores/apiTesterStore";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { usePanelStore } from "@/stores/panelStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useColorPickerStore } from "@/stores/colorPickerStore";
import { useLivePreviewStore } from "@/stores/livePreviewStore";
import { useStorybookStore } from "@/stores/storybookStore";
import { useEnvStore } from "@/stores/envStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useOverwatchStore } from "@/stores/overwatchStore";

interface ConfirmDialogState {
  isOpen: boolean;
  categoryId: string | null;
  categoryName: string;
  isResetAll: boolean;
}

interface ImportState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  categoriesImported: string[];
}

export function DataManagementTab() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    categoryId: null,
    categoryName: "",
    isResetAll: false,
  });

  const [importState, setImportState] = useState<ImportState>({
    status: "idle",
    message: "",
    categoriesImported: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get reset functions from stores
  const sessionReset = useSessionStore((s) => s.reset);
  const workspaceReset = useWorkspaceStore((s) => s.reset);
  const subscriptionReset = useSubscriptionStore((s) => s.reset);
  const apiTesterReset = useApiTesterStore((s) => s.reset);
  const databaseViewerReset = useDatabaseViewerStore((s) => s.reset);
  const panelReset = usePanelStore((s) => s.reset);
  const terminalReset = useTerminalStore((s) => s.reset);
  const colorPickerReset = useColorPickerStore((s) => s.reset);
  const livePreviewReset = useLivePreviewStore((s) => s.reset);
  const storybookReset = useStorybookStore((s) => s.reset);
  const envReset = useEnvStore((s) => s.reset);
  const onboardingReset = useOnboardingStore((s) => s.reset);
  const overwatchReset = useOverwatchStore((s) => s.reset);

  // Calculate sizes
  const categorySizes = useMemo(() => {
    const sizes: Record<string, number> = {};
    for (const category of DATA_CATEGORIES) {
      sizes[category.id] = getCategorySize(category.keys);
    }
    return sizes;
  }, []);

  const totalSize = useMemo(() => getTotalStorageSize(), []);

  // Handlers
  const handleExport = useCallback((category: DataCategory) => {
    const data = getCategoryData(category.keys);
    const filename = `wynter-code-${category.id}-${new Date().toISOString().split("T")[0]}.json`;
    exportToJson(data, filename);
  }, []);

  const handleClearRequest = useCallback((category: DataCategory) => {
    setConfirmDialog({
      isOpen: true,
      categoryId: category.id,
      categoryName: category.name,
      isResetAll: false,
    });
  }, []);

  const handleResetAllRequest = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      categoryId: null,
      categoryName: "All Data",
      isResetAll: true,
    });
  }, []);

  const handleConfirmClear = useCallback(() => {
    const { categoryId, isResetAll } = confirmDialog;

    if (isResetAll) {
      // Clear all categories except settings
      for (const category of DATA_CATEGORIES) {
        if (!category.isProtected) {
          clearStorageKeys(category.keys);
        }
      }
      // Call all reset functions
      sessionReset?.();
      workspaceReset?.();
      subscriptionReset?.();
      apiTesterReset?.();
      databaseViewerReset?.();
      panelReset?.();
      terminalReset?.();
      colorPickerReset?.();
      livePreviewReset?.();
      storybookReset?.();
      envReset?.();
      onboardingReset?.();
      overwatchReset?.();
    } else if (categoryId) {
      const category = DATA_CATEGORIES.find((c) => c.id === categoryId);
      if (category) {
        clearStorageKeys(category.keys);
        // Call appropriate reset function(s)
        switch (categoryId) {
          case "sessions":
            sessionReset?.();
            break;
          case "workspaces":
            workspaceReset?.();
            subscriptionReset?.();
            break;
          case "tools":
            apiTesterReset?.();
            databaseViewerReset?.();
            storybookReset?.();
            break;
          case "ui":
            panelReset?.();
            terminalReset?.();
            colorPickerReset?.();
            livePreviewReset?.();
            break;
          case "system":
            envReset?.();
            onboardingReset?.();
            overwatchReset?.();
            break;
        }
      }
    }

    setConfirmDialog({
      isOpen: false,
      categoryId: null,
      categoryName: "",
      isResetAll: false,
    });

    // Force re-render to update sizes
    window.location.reload();
  }, [
    confirmDialog,
    sessionReset,
    workspaceReset,
    subscriptionReset,
    apiTesterReset,
    databaseViewerReset,
    panelReset,
    terminalReset,
    colorPickerReset,
    livePreviewReset,
    storybookReset,
    envReset,
    onboardingReset,
    overwatchReset,
  ]);

  const handleCancelClear = useCallback(() => {
    setConfirmDialog({
      isOpen: false,
      categoryId: null,
      categoryName: "",
      isResetAll: false,
    });
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState({ status: "loading", message: "Reading file...", categoriesImported: [] });

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if this is a backup file with metadata
      if (data.metadata && data.data) {
        // This is a full backup file from web backup
        const categoriesImported: string[] = [];

        for (const [categoryId, categoryData] of Object.entries(data.data)) {
          if (typeof categoryData === "object" && categoryData !== null) {
            for (const [storeKey, storeData] of Object.entries(categoryData as Record<string, unknown>)) {
              localStorage.setItem(storeKey, JSON.stringify(storeData));
            }
            categoriesImported.push(categoryId);
          }
        }

        setImportState({
          status: "success",
          message: `Imported ${categoriesImported.length} categories from backup`,
          categoriesImported,
        });

        // Reload after short delay to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // This is a single category export
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, JSON.stringify(value));
        }

        setImportState({
          status: "success",
          message: "Import complete! Reloading...",
          categoriesImported: [],
        });

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setImportState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to parse JSON file",
        categoriesImported: [],
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Storage usage percentage (assuming ~5MB limit)
  const storageLimit = 5 * 1024 * 1024; // 5MB
  const usagePercent = Math.min((totalSize / storageLimit) * 100, 100);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-text-primary mb-4">
        Data Management
      </h2>

      {/* Storage Overview */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            Storage Used: {formatBytes(totalSize)}
          </span>
        </div>
        <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-accent"
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          localStorage is limited to ~5MB per domain
        </p>
      </div>

      {/* Import from Backup */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <FileJson className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Import from Backup
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Import data from a backup JSON file downloaded from your web backup page
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {importState.status === "idle" && (
              <button
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Select Backup JSON
              </button>
            )}

            {importState.status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <span>{importState.message}</span>
              </div>
            )}

            {importState.status === "success" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importState.message}</span>
                </div>
                {importState.categoriesImported.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {importState.categoriesImported.map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importState.status === "error" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{importState.message}</span>
                </div>
                <button
                  onClick={() => setImportState({ status: "idle", message: "", categoriesImported: [] })}
                  className="text-xs text-text-secondary hover:text-text-primary"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Categories */}
      <div className="space-y-3">
        {DATA_CATEGORIES.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            size={categorySizes[category.id]}
            onExport={() => handleExport(category)}
            onClear={() => handleClearRequest(category)}
          />
        ))}
      </div>

      {/* Danger Zone */}
      <div className="border-t border-border pt-6 mt-6">
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-medium text-red-400">Danger Zone</h3>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Reset all app data. Your settings (theme, fonts, etc.) will be preserved.
          </p>
          <button
            onClick={handleResetAllRequest}
            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
          >
            Reset All Data
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          categoryName={confirmDialog.categoryName}
          isResetAll={confirmDialog.isResetAll}
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      )}
    </div>
  );
}

interface CategoryRowProps {
  category: DataCategory;
  size: number;
  onExport: () => void;
  onClear: () => void;
}

function CategoryRow({ category, size, onExport, onClear }: CategoryRowProps) {
  return (
    <div className="p-4 rounded-lg bg-bg-secondary border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">
              {category.name}
            </h3>
            {category.isProtected && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-accent/20 text-accent">
                <Shield className="w-3 h-3" />
                Protected
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {category.description}
          </p>
        </div>
        <span className="text-sm text-text-secondary font-mono">
          {formatBytes(size)}
        </span>
      </div>

      <div className="flex gap-2 mt-3">
        {category.canExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        )}
        {category.canClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  categoryName: string;
  isResetAll: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ categoryName, isResetAll, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-primary rounded-xl border border-border shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-text-primary">
            {isResetAll ? "Reset All Data?" : `Clear ${categoryName}?`}
          </h3>
        </div>

        <p className="text-sm text-text-secondary mb-6">
          {isResetAll ? (
            <>
              This will permanently delete all app data except your settings.
              Your sessions, workspaces, tool data, and system data will be cleared.
              <br /><br />
              <strong className="text-text-primary">This action cannot be undone.</strong>
            </>
          ) : (
            <>
              This will permanently delete all data in <strong className="text-text-primary">{categoryName}</strong>.
              <br /><br />
              <strong className="text-text-primary">This action cannot be undone.</strong>
            </>
          )}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm transition-colors"
          >
            {isResetAll ? "Reset All" : "Clear Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

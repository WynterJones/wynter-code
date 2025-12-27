import { useState, useEffect } from "react";
import {
  RefreshCw,
  Trash2,
  AppWindow,
  AlertCircle,
  HardDrive,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/lib/utils";
import { useSystemCleanerStore } from "@/stores/systemCleanerStore";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledApp } from "@/types/systemCleaner";

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

function shortenPath(path: string): string {
  return path.replace("/Applications/", "");
}

interface AppRowProps {
  app: InstalledApp;
  onUninstall: (path: string) => void;
  isDeleting: boolean;
}

function AppRow({ app, onUninstall, isDeleting }: AppRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReveal = async () => {
    try {
      await invoke("reveal_in_finder", { path: app.path });
    } catch (e) {
      console.error("Failed to reveal in Finder:", e);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-tertiary/50 hover:border-border-hover transition-colors">
      <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
        {app.iconData ? (
          <img src={app.iconData} alt={app.name} className="w-10 h-10 object-contain" />
        ) : (
          <AppWindow className="w-5 h-5 text-text-tertiary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{app.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono flex-shrink-0">
            {app.formattedSize}
          </span>
          {app.version && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              v{app.version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-secondary truncate">
            {shortenPath(app.path)}
          </span>
          {app.bundleId && (
            <span className="text-[10px] text-text-secondary/50 truncate">
              {app.bundleId}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReveal}
          className="text-text-secondary hover:text-text-primary"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>

        {showConfirm ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                onUninstall(app.path);
                setShowConfirm(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConfirm(true)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function InstalledAppsView() {
  const {
    installedApps,
    installedAppsTotalSize,
    scanInstalledApps,
    uninstallApp,
    isScanning,
    isDeleting,
    error,
    clearError,
  } = useSystemCleanerStore();

  const [deleteResult, setDeleteResult] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Scan on mount
  useEffect(() => {
    if (installedApps.length === 0) {
      scanInstalledApps();
    }
  }, []);

  const handleUninstall = async (path: string) => {
    const app = installedApps.find((a) => a.path === path);
    const result = await uninstallApp(path);
    if (result && app) {
      setDeleteResult({
        name: app.name,
        size: result.spaceRecoveredFormatted,
      });
    }
  };

  const filteredApps = installedApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <AppWindow className="w-5 h-5 text-accent" />
          <div>
            <h2 className="font-medium text-text-primary">Installed Apps</h2>
            <p className="text-xs text-text-secondary">
              {installedApps.length} apps &middot; {formatSize(installedAppsTotalSize)} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder-text-tertiary w-48"
          />
          <Button
            onClick={() => scanInstalledApps()}
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
            Moved {deleteResult.name} to Trash, recovered {deleteResult.size}
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

      {/* Info Banner */}
      <div className="flex items-center gap-2 mx-4 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">
          Apps are sorted by size. Uninstalling moves apps to Trash. Some apps may
          leave behind preferences in ~/Library.
        </span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 mt-3" scrollbarVisibility="visible">
        {isScanning ? (
          <div className="flex items-center justify-center h-32 text-text-secondary">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Scanning installed apps...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <AppWindow className="w-8 h-8 mb-2 opacity-50" />
            <p>
              {searchQuery
                ? `No apps matching "${searchQuery}"`
                : "No apps found in /Applications"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredApps.map((app) => (
              <AppRow
                key={app.path}
                app={app}
                onUninstall={handleUninstall}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

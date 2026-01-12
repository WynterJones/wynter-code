import {
  X,
  Package,
  Search,
  AlertCircle,
  GitFork,
  Stethoscope,
  RefreshCw,
  Download,
  Beer,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { SearchableToolSidebar } from "../shared/SearchableToolSidebar";
import { useHomebrewStore } from "@/stores/homebrewStore";
import { InstalledPackagesView } from "./views/InstalledPackagesView";
import { SearchPackagesView } from "./views/SearchPackagesView";
import { OutdatedPackagesView } from "./views/OutdatedPackagesView";
import { TapsManagerView } from "./views/TapsManagerView";
import { DoctorView } from "./views/DoctorView";
import { PackageDetailPanel } from "./PackageDetailPanel";
import { usePopupVisibility } from "@/stores/popupRegistryStore";
import type { HomebrewTool } from "./types";

interface HomebrewManagerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: string;
}

interface ToolCategory {
  name: string;
  tools: HomebrewTool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "Packages",
    tools: [
      {
        id: "installed",
        name: "Installed",
        description: "View all installed packages",
        icon: Package,
      },
      {
        id: "outdated",
        name: "Outdated",
        description: "Packages with available updates",
        icon: AlertCircle,
      },
      {
        id: "search",
        name: "Search",
        description: "Find and install new packages",
        icon: Search,
      },
    ],
  },
  {
    name: "Configuration",
    tools: [
      {
        id: "taps",
        name: "Taps",
        description: "Manage Homebrew repositories",
        icon: GitFork,
      },
      {
        id: "doctor",
        name: "Doctor",
        description: "Run diagnostics",
        icon: Stethoscope,
      },
    ],
  },
];

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((cat) => cat.tools);

export function HomebrewManagerPopup({ isOpen, onClose, initialView }: HomebrewManagerPopupProps) {
  // Register with popup registry so farmwork mini player hides when popup is open
  usePopupVisibility(isOpen);

  const [activeTool, setActiveTool] = useState("installed");
  const {
    isBrewInstalled,
    brewVersion,
    isLoading,
    isOperating,
    operationMessage,
    error,
    outdatedPackages,
    selectedPackage,
    checkBrewInstalled,
    fetchInstalledPackages,
    fetchOutdatedPackages,
    updateBrew,
    clearError,
    clearSelectedPackage,
  } = useHomebrewStore();

  // Set initial view when provided
  useEffect(() => {
    if (initialView && ALL_TOOLS.some((t) => t.id === initialView)) {
      setActiveTool(initialView);
    }
  }, [initialView]);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      checkBrewInstalled().then(() => {
        fetchInstalledPackages();
        fetchOutdatedPackages();
      });
    }
  }, [isOpen, checkBrewInstalled, fetchInstalledPackages, fetchOutdatedPackages]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedPackage) {
          clearSelectedPackage();
        } else {
          onClose();
        }
      }
    },
    [onClose, selectedPackage, clearSelectedPackage]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const activeToolData = ALL_TOOLS.find((t) => t.id === activeTool);
  const outdatedCount = outdatedPackages.length;

  // Add badge to outdated tool
  const categoriesWithBadges = TOOL_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.map((tool) => ({
      ...tool,
      badge: tool.id === "outdated" && outdatedCount > 0 ? outdatedCount : undefined,
    })),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <Beer className="w-5 h-5 text-accent" />
            <span className="font-medium text-text-primary">Homebrew Manager</span>
            {activeToolData && (
              <span className="text-sm text-text-tertiary">/ {activeToolData.name}</span>
            )}
            {brewVersion && (
              <span className="text-xs text-text-tertiary px-2 py-0.5 bg-bg-tertiary rounded">
                {brewVersion}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Update Homebrew button */}
            <Tooltip content="Update Homebrew" side="bottom">
              <IconButton
                size="sm"
                onClick={() => updateBrew()}
                disabled={isOperating}
                aria-label="Update Homebrew"
              >
                <Download className="w-4 h-4" />
              </IconButton>
            </Tooltip>

            {/* Refresh button */}
            <Tooltip content="Refresh" side="bottom">
              <IconButton
                size="sm"
                onClick={() => {
                  fetchInstalledPackages();
                  fetchOutdatedPackages();
                }}
                disabled={isLoading}
                aria-label="Refresh package lists"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </IconButton>
            </Tooltip>

            <Tooltip content="Close (Esc)" side="bottom">
              <IconButton size="sm" onClick={onClose} aria-label="Close Homebrew Manager">
                <X className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
            <span className="text-sm text-red-400">{error}</span>
            <IconButton size="sm" onClick={clearError} aria-label="Dismiss error message">
              <X className="w-3 h-3" />
            </IconButton>
          </div>
        )}

        {/* Operating overlay */}
        {isOperating && (
          <div className="px-4 py-2 bg-accent/10 border-b border-accent/20 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-accent animate-spin" />
            <span className="text-sm text-accent">{operationMessage}</span>
          </div>
        )}

        {/* Homebrew not installed */}
        {isBrewInstalled === false && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Beer className="w-16 h-16 text-text-tertiary mx-auto" />
              <h2 className="text-xl font-medium text-text-primary">
                Homebrew is not installed
              </h2>
              <p className="text-text-secondary max-w-md">
                Homebrew is a package manager for macOS. Visit{" "}
                <a
                  href="https://brew.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  brew.sh
                </a>{" "}
                to install it.
              </p>
            </div>
          </div>
        )}

        {/* Main content */}
        {isBrewInstalled && (
          <div className="flex flex-1 min-h-0">
            <SearchableToolSidebar
              categories={categoriesWithBadges}
              activeToolId={activeTool}
              onToolSelect={setActiveTool}
              searchPlaceholder="Search tools..."
            />

            <div className="flex-1 flex min-h-0">
              <ScrollArea className="flex-1" scrollbarVisibility="visible">
                <div className="h-full">
                  {activeTool === "installed" && <InstalledPackagesView />}
                  {activeTool === "outdated" && <OutdatedPackagesView />}
                  {activeTool === "search" && <SearchPackagesView />}
                  {activeTool === "taps" && <TapsManagerView />}
                  {activeTool === "doctor" && <DoctorView />}
                </div>
              </ScrollArea>

              {/* Detail panel */}
              {selectedPackage && <PackageDetailPanel />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { useProjectStore } from "@/stores";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { TycoonGame } from "./game/TycoonGame";
import { StatsSidebar } from "./sidebar/StatsSidebar";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import type { BeadsIssue } from "@/types/beads";
import { open } from "@tauri-apps/plugin-shell";
import {
  Play,
  Pause,
  RefreshCw,
  Bug,
  TestTube,
  Trash2,
  Tractor,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  MessageSquareOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmworkTycoonPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMarkdownFile?: (filePath: string) => void;
}

export function FarmworkTycoonPopup({ isOpen, onClose, onOpenMarkdownFile }: FarmworkTycoonPopupProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = useMemo(
    () => (activeProjectId ? getProject(activeProjectId) : undefined),
    [activeProjectId, getProject]
  );
  const { createSession } = useSessionStore();
  const { queueCommand } = useTerminalStore();
  const {
    isInitialized,
    isPaused,
    showDebug,
    hideTooltips,
    initialize,
    pause,
    resume,
    toggleDebug,
    toggleHideTooltips,
    refreshStats,
    showMiniPlayerFn,
    startTestRun,
    clearAllVehicles,
    setBeadsEnabled,
    syncBeadVehicles,
    pendingBuildingSelection,
    setPendingBuildingSelection,
  } = useFarmworkTycoonStore();

  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [farmworkStatus, setFarmworkStatus] = useState<"checking" | "installed" | "not_installed_globally" | "not_initialized_in_project">("checking");
  const [copied, setCopied] = useState(false);

  // Capture pending building selection and clear it (for mini player -> full popup flow)
  const initialBuildingRef = useRef<string | null>(null);
  if (isOpen && pendingBuildingSelection && !initialBuildingRef.current) {
    initialBuildingRef.current = pendingBuildingSelection;
    setPendingBuildingSelection(null);
  }
  // Reset ref when popup closes
  useEffect(() => {
    if (!isOpen) {
      initialBuildingRef.current = null;
    }
  }, [isOpen]);

  // Get the appropriate command based on current status
  const getCommand = useCallback(() => {
    return farmworkStatus === "not_installed_globally"
      ? "npm install -g farmwork"
      : "farmwork init";
  }, [farmworkStatus]);

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(getCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCommand = () => {
    if (!activeProjectId) return;

    // Create a new terminal session
    const sessionId = createSession(activeProjectId, "terminal");

    // Queue the appropriate command based on status
    queueCommand(sessionId, getCommand());

    // Close the popup
    onClose();
  };

  // Audit file mapping
  const AUDIT_FILE_MAP: Record<string, string> = {
    security: "_AUDIT/SECURITY.md",
    tests: "_AUDIT/TESTS.md",
    performance: "_AUDIT/PERFORMANCE.md",
    accessibility: "_AUDIT/ACCESSIBILITY.md",
    codeQuality: "_AUDIT/CODE_QUALITY.md",
    farmhouse: "_AUDIT/FARMHOUSE.md",
    garden: "_AUDIT/GARDEN.md",
    compost: "_AUDIT/COMPOST.md",
  };

  // Handle opening audit file - minimize to mini player and open in markdown viewer
  const handleOpenAuditFile = useCallback(async (buildingType: string) => {
    if (!activeProject?.path) return;

    const auditFile = AUDIT_FILE_MAP[buildingType];
    if (!auditFile) return;

    // Construct full path
    const fullPath = await join(activeProject.path, auditFile);

    // Show mini player and close popup
    showMiniPlayerFn();
    onClose();

    // Open in markdown viewer popup
    if (onOpenMarkdownFile) {
      onOpenMarkdownFile(fullPath);
    }
  }, [activeProject?.path, showMiniPlayerFn, onClose, onOpenMarkdownFile]);

  // Check if farmwork CLI is installed globally and if project is initialized
  const checkFarmworkStatus = useCallback(async (projectPath: string) => {
    try {
      // First check if farmwork CLI is installed globally
      const isGloballyInstalled = await invoke<boolean>("validate_mcp_command", { command: "farmwork" });

      if (!isGloballyInstalled) {
        setFarmworkStatus("not_installed_globally");
        return false;
      }

      // CLI is installed, now check if project has .farmwork.json
      const configPath = await join(projectPath, ".farmwork.json");
      const configExists = await exists(configPath);

      if (!configExists) {
        setFarmworkStatus("not_initialized_in_project");
        return false;
      }

      setFarmworkStatus("installed");
      return true;
    } catch (error) {
      setFarmworkStatus("not_installed_globally");
      return false;
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeProject?.path) {
      setFarmworkStatus("checking");
      checkFarmworkStatus(activeProject.path).then((isReady) => {
        if (isReady) {
          window.__FARMWORK_PROJECT_PATH__ = activeProject.path;
          if (!isInitialized) {
            initialize(activeProject.path);
          } else {
            refreshStats();
          }
        }
      });
    } else if (isOpen && !activeProject?.path) {
      setFarmworkStatus("not_installed_globally");
    }
  }, [isOpen, activeProject?.path, isInitialized, initialize, refreshStats, checkFarmworkStatus]);

  // Poll for stats updates and beads issues every 5 seconds while popup is open
  useEffect(() => {
    if (!isOpen || !isInitialized || farmworkStatus !== "installed") return;

    const pollBeadsAndStats = async () => {
      // Refresh farmwork stats
      refreshStats();

      // Poll beads if installed
      if (activeProject?.path) {
        try {
          const hasBeads = await invoke<boolean>("beads_has_init", {
            projectPath: activeProject.path,
          });

          if (hasBeads) {
            setBeadsEnabled(true);
            const issues = await invoke<BeadsIssue[]>("beads_list", {
              projectPath: activeProject.path,
            });
            syncBeadVehicles(issues);
          } else {
            setBeadsEnabled(false);
          }
        } catch (error) {
          // Beads not available
          setBeadsEnabled(false);
        }
      }
    };

    // Initial poll
    pollBeadsAndStats();

    // Poll every 5 seconds
    const pollInterval = setInterval(pollBeadsAndStats, 5000);

    return () => clearInterval(pollInterval);
  }, [isOpen, isInitialized, refreshStats, farmworkStatus, activeProject?.path, setBeadsEnabled, syncBeadVehicles]);

  const handleOpenFarmworkSite = async () => {
    await open("https://farmwork.dev");
  };

  useEffect(() => {
    const updateSize = () => {
      const availableHeight = window.innerHeight - 180;
      const availableWidth = window.innerWidth - 320 - 80;
      const size = Math.min(availableHeight, availableWidth, 1000);
      setContainerSize({ width: Math.max(300, size), height: Math.max(300, size) });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Show setup screen if farmwork is not installed globally or not initialized in project
  if (farmworkStatus === "not_installed_globally" || farmworkStatus === "not_initialized_in_project") {
    const isGlobalInstall = farmworkStatus === "not_installed_globally";
    const command = getCommand();

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Farmwork Tycoon"
        size="md"
      >
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center mb-6">
            <Tractor className="w-10 h-10 text-lime-500" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            {isGlobalInstall ? "Set Up Farmwork" : "Initialize Farmwork"}
          </h2>
          {isGlobalInstall ? (
            <>
              <p className="text-sm text-text-secondary max-w-md mb-2">
                Farmwork is an agentic development harness that brings AI-assisted workflows to your project.
              </p>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Install globally via npm, then run <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">farmwork init</code> in your project to create the config file.
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary max-w-md mb-6">
              Farmwork is installed! Initialize it in this project to enable AI-assisted workflows and start tracking your development metrics.
            </p>
          )}

          {/* Terminal-style code block */}
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg border border-neutral-700 px-4 py-3">
              <code className="text-sm font-mono text-neutral-100">
                <span className="text-neutral-500">$ </span>
                {command}
              </code>
              <button
                onClick={handleCopyCommand}
                className="ml-3 p-1.5 rounded hover:bg-neutral-700 transition-colors"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-neutral-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunCommand}
              className="btn-primary flex items-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              <span>{isGlobalInstall ? "Install in Terminal" : "Initialize in Terminal"}</span>
            </button>
            <button
              onClick={handleOpenFarmworkSite}
              className="btn-secondary flex items-center gap-2"
            >
              <span>Learn More</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show loading state while checking
  if (farmworkStatus === "checking") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Farmwork Tycoon"
        size="md"
      >
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-8 h-8 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary mt-4">Checking project configuration...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Farmwork Tycoon"
      size="full"
    >
      <div className="flex h-[calc(100vh-100px)] overflow-hidden">
        {/* Game Canvas - centered with arcade cabinet style */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 p-4 overflow-hidden min-h-0">
          {/* Arcade Cabinet Frame */}
          <div
            className="relative max-h-full flex flex-col"
            style={{
              padding: "16px 16px 12px 16px",
              background: "linear-gradient(180deg, #252525 0%, #1a1a1a 30%, #0d0d0d 100%)",
              borderRadius: "12px",
              border: "3px solid #3a3a3a",
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,255,255,0.08)
              `,
            }}
          >
            {/* Screen bezel */}
            <div
              className="relative overflow-hidden"
              style={{
                padding: "6px",
                background: "#0a0a0a",
                borderRadius: "6px",
                border: "2px solid #222",
              }}
            >
              {/* CRT Screen glow effect */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(100,255,100,0.03) 0%, transparent 70%)",
                  zIndex: 1,
                }}
              />

              {/* Game canvas */}
              <div className="relative">
                <TycoonGame
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                  initialSelectedBuilding={initialBuildingRef.current}
                  onOpenAuditFile={handleOpenAuditFile}
                />

                {/* Scanline overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 2px,
                      rgba(0, 0, 0, 0.15) 2px,
                      rgba(0, 0, 0, 0.15) 4px
                    )`,
                    zIndex: 10,
                  }}
                />

                {/* Screen reflection/glare */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                    zIndex: 11,
                  }}
                />

                {/* Vignette effect */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 100px rgba(0,0,0,0.4)",
                    zIndex: 12,
                  }}
                />
              </div>
            </div>

            {/* Cabinet label */}
            <div className="mt-3 flex items-center justify-center">
              <span
                className="text-xs font-bold tracking-[0.25em] uppercase px-4"
                style={{
                  color: "#555",
                  textShadow: "0 1px 0 rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.05)",
                  letterSpacing: "0.25em",
                }}
              >
                Farmwork Tycoon
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Fixed width with scroll */}
        <div className="w-80 flex-shrink-0 flex flex-col border-l border-border bg-bg-secondary overflow-hidden min-h-0">
          {/* Mini Farm Bar - Always visible */}
          <div className="p-3 border-b border-border flex-shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                showMiniPlayerFn();
                onClose();
              }}
              className="btn-primary text-xs"
            >
              Open Mini Farm
            </button>
            <Tooltip content={hideTooltips ? "Show Tooltips" : "Hide Tooltips"}>
              <IconButton
                size="sm"
                onClick={toggleHideTooltips}
                className={cn(hideTooltips && "text-yellow-400 bg-yellow-400/10")}
                aria-label={hideTooltips ? "Show game tooltips" : "Hide game tooltips"}
              >
                <MessageSquareOff className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          </div>

          {/* Dev Controls - Only visible in development */}
          {import.meta.env.DEV && (
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-1">
                <Tooltip content={isPaused ? "Resume" : "Pause"}>
                  <IconButton
                    size="sm"
                    onClick={isPaused ? resume : pause}
                    className={cn(isPaused && "text-amber-400")}
                    aria-label={isPaused ? "Resume game" : "Pause game"}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </IconButton>
                </Tooltip>
                <Tooltip content="Refresh Stats">
                  <IconButton size="sm" onClick={refreshStats} aria-label="Refresh game statistics">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Toggle Debug (G)">
                  <IconButton
                    size="sm"
                    onClick={toggleDebug}
                    className={cn(showDebug && "text-green-400 bg-green-400/10")}
                    aria-label="Toggle debug mode"
                  >
                    <Bug className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <div className="w-px h-4 bg-border mx-1" />
                <Tooltip content="Test Run - spawn vehicles to all buildings">
                  <IconButton
                    size="sm"
                    onClick={startTestRun}
                    className="text-purple-400 hover:bg-purple-400/10"
                    aria-label="Start test run with spawned vehicles"
                  >
                    <TestTube className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Clear all vehicles">
                  <IconButton
                    size="sm"
                    onClick={clearAllVehicles}
                    className="text-red-400 hover:bg-red-400/10"
                    aria-label="Clear all spawned vehicles"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Stats with OverlayScrollbars */}
          <OverlayScrollbarsComponent
            className="flex-1 min-h-0 os-theme-light"
            options={{ scrollbars: { autoHide: "scroll", theme: "os-theme-light" } }}
          >
            <StatsSidebar />
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </Modal>
  );
}

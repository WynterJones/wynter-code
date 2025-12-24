import { useEffect, useState, useMemo, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { useProjectStore } from "@/stores";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { TycoonGame } from "./game/TycoonGame";
import { StatsSidebar } from "./sidebar/StatsSidebar";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FarmworkTycoonPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FarmworkTycoonPopup({ isOpen, onClose }: FarmworkTycoonPopupProps) {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = useMemo(
    () => (activeProjectId ? getProject(activeProjectId) : undefined),
    [activeProjectId, getProject]
  );
  const {
    isInitialized,
    isPaused,
    showDebug,
    initialize,
    pause,
    resume,
    toggleDebug,
    refreshStats,
    showMiniPlayerFn,
    startTestRun,
    clearAllVehicles,
  } = useFarmworkTycoonStore();

  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [farmworkStatus, setFarmworkStatus] = useState<"checking" | "installed" | "not_installed">("checking");

  // Check if .farmwork.json exists in the project
  const checkFarmworkConfig = useCallback(async (projectPath: string) => {
    try {
      const configPath = await join(projectPath, ".farmwork.json");
      console.log("[Farmwork] Checking for config at:", configPath);
      console.log("[Farmwork] Project path:", projectPath);
      const configExists = await exists(configPath);
      console.log("[Farmwork] Config exists:", configExists);
      setFarmworkStatus(configExists ? "installed" : "not_installed");
      return configExists;
    } catch (err) {
      console.log("[Farmwork] Error checking config:", err);
      setFarmworkStatus("not_installed");
      return false;
    }
  }, []);

  useEffect(() => {
    console.log("[Farmwork] useEffect triggered - isOpen:", isOpen, "activeProject:", activeProject?.path);
    if (isOpen && activeProject?.path) {
      setFarmworkStatus("checking");
      checkFarmworkConfig(activeProject.path).then((hasConfig) => {
        if (hasConfig) {
          window.__FARMWORK_PROJECT_PATH__ = activeProject.path;
          if (!isInitialized) {
            initialize(activeProject.path);
          } else {
            refreshStats();
          }
        }
      });
    } else if (isOpen && !activeProject?.path) {
      console.log("[Farmwork] No active project path available");
      setFarmworkStatus("not_installed");
    }
  }, [isOpen, activeProject?.path, isInitialized, initialize, refreshStats, checkFarmworkConfig]);

  // Poll for stats updates every 5 seconds while popup is open
  useEffect(() => {
    if (!isOpen || !isInitialized || farmworkStatus !== "installed") return;

    const pollInterval = setInterval(() => {
      refreshStats();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isOpen, isInitialized, refreshStats, farmworkStatus]);

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

  // Show install screen if farmwork is not installed
  if (farmworkStatus === "not_installed") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Farmwork Tycoon"
        size="md"
      >
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center mb-6">
            <Tractor className="w-10 h-10 text-lime-500" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            Farmwork Not Installed
          </h2>
          <p className="text-sm text-text-secondary max-w-md mb-6">
            Please install Farmwork.dev to this project to enable Farmwork Tycoon.
            This will create a <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">.farmwork.json</code> config file in your project root.
          </p>
          <button
            onClick={handleOpenFarmworkSite}
            className="btn-primary flex items-center gap-2"
          >
            <span>Visit Farmwork.dev</span>
            <ExternalLink className="w-4 h-4" />
          </button>
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
          <div className="p-3 border-b border-border flex-shrink-0">
            <button
              onClick={() => {
                showMiniPlayerFn();
                onClose();
              }}
              className="btn-primary text-xs"
            >
              Open Mini Farm
            </button>
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
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </IconButton>
                </Tooltip>
                <Tooltip content="Refresh Stats">
                  <IconButton size="sm" onClick={refreshStats}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Toggle Debug (G)">
                  <IconButton
                    size="sm"
                    onClick={toggleDebug}
                    className={cn(showDebug && "text-green-400 bg-green-400/10")}
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
                  >
                    <TestTube className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
                <Tooltip content="Clear all vehicles">
                  <IconButton
                    size="sm"
                    onClick={clearAllVehicles}
                    className="text-red-400 hover:bg-red-400/10"
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

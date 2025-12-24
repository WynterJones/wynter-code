import { useEffect, useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { useProjectStore } from "@/stores";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { TycoonGame } from "./game/TycoonGame";
import { StatsSidebar } from "./sidebar/StatsSidebar";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  Play,
  Pause,
  RefreshCw,
  Bug,
  Minimize2,
  TestTube,
  Trash2,
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

  useEffect(() => {
    if (isOpen && activeProject?.path) {
      window.__FARMWORK_PROJECT_PATH__ = activeProject.path;
      if (!isInitialized) {
        initialize(activeProject.path);
      } else {
        refreshStats();
      }
    }
  }, [isOpen, activeProject?.path, isInitialized, initialize, refreshStats]);

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
            className="relative max-h-full"
            style={{
              padding: "12px",
              background: "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
              borderRadius: "8px",
              boxShadow: `
                0 0 0 2px #333,
                0 0 0 4px #1a1a1a,
                0 0 20px rgba(0,0,0,0.8),
                inset 0 2px 4px rgba(255,255,255,0.05)
              `,
            }}
          >
            {/* Screen bezel */}
            <div
              className="relative overflow-hidden"
              style={{
                padding: "8px",
                background: "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)",
                borderRadius: "4px",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8)",
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
            <div className="mt-2 text-center">
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{
                  color: "#666",
                  textShadow: "0 1px 0 rgba(0,0,0,0.5)",
                }}
              >
                Farmwork Tycoon
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Fixed width with scroll */}
        <div className="w-80 flex-shrink-0 flex flex-col border-l border-border bg-bg-secondary overflow-hidden min-h-0">
          {/* Control Bar */}
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
              <div className="flex-1" />
              <Tooltip content="Pop out mini player">
                <IconButton
                  size="sm"
                  onClick={() => {
                    showMiniPlayerFn();
                    onClose();
                  }}
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

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

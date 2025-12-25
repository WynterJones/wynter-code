import { useEffect, useCallback, useState } from "react";
import { X, Bot, Play, Pause, Square, SkipForward, Settings } from "lucide-react";
import { createPortal } from "react-dom";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { useBeadsStore } from "@/stores/beadsStore";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui";
import { AutoBuildKanban } from "./AutoBuildKanban";
import { AutoBuildLog } from "./AutoBuildLog";
import { AutoBuildSettingsPopup } from "./AutoBuildSettingsPopup";
import { cn } from "@/lib/utils";

interface AutoBuildPopupProps {
  projectPath: string;
}

export function AutoBuildPopup({ projectPath }: AutoBuildPopupProps) {
  const {
    closePopup,
    setProjectPath,
    status,
    queue,
    completed,
    loadSession,
    start,
    pause,
    resume,
    stop,
    skipCurrent,
    currentIssueId,
    currentPhase,
  } = useAutoBuildStore();

  const { issues, fetchIssues, setProjectPath: setBeadsProjectPath } = useBeadsStore();
  const [showSettings, setShowSettings] = useState(false);

  // Initialize on mount
  useEffect(() => {
    setProjectPath(projectPath);
    setBeadsProjectPath(projectPath);
    fetchIssues();
    loadSession();
  }, [projectPath, setProjectPath, setBeadsProjectPath, fetchIssues, loadSession]);

  // Cache issues in autoBuildStore
  useEffect(() => {
    const { cacheIssue } = useAutoBuildStore.getState();
    issues.forEach((issue) => cacheIssue(issue));
  }, [issues]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) {
          setShowSettings(false);
        } else {
          closePopup();
        }
      }
    },
    [closePopup, showSettings]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const totalQueued = queue.length;
  const totalCompleted = completed.length;

  const isIdle = status === "idle";
  const isRunning = status === "running";
  const isPaused = status === "paused";
  const canStart = isIdle && queue.length > 0;
  const canPause = isRunning;
  const canResume = isPaused && queue.length > 0;
  const canStop = isRunning || isPaused;
  const canSkip = (isRunning || isPaused) && currentIssueId;

  // Get current phase label
  const getPhaseLabel = () => {
    if (!currentPhase) return null;
    switch (currentPhase) {
      case "selecting": return "Selecting...";
      case "working": return "Working...";
      case "testing": return "Testing...";
      case "committing": return "Committing...";
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={closePopup} />

      {/* Popup Container */}
      <div
        className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-150"
        style={{
          width: "calc(100vw - 60px)",
          height: "calc(100vh - 60px)",
          maxWidth: "1600px",
          maxHeight: "900px",
        }}
      >
        {/* Header with Controls */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4">
          {/* Left: Title and Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-accent" />
              <h1 className="text-lg font-semibold">Auto Build</h1>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isRunning && "animate-pulse bg-green-500",
                  isPaused && "bg-amber-500",
                  isIdle && "bg-text-secondary",
                  status === "error" && "bg-red-500"
                )}
              />
              <span className="text-sm capitalize text-text-secondary">{status}</span>
              {currentPhase && (
                <span className="text-sm text-text-secondary">· {getPhaseLabel()}</span>
              )}
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-1">
            {/* Play/Resume */}
            <Tooltip content={isPaused ? "Resume" : "Start"}>
              <IconButton
                size="sm"
                onClick={canResume ? resume : start}
                disabled={!canStart && !canResume}
                className={cn(
                  (canStart || canResume) && "text-green-400 hover:bg-green-500/20"
                )}
              >
                <Play className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            {/* Pause */}
            <Tooltip content="Pause">
              <IconButton
                size="sm"
                onClick={pause}
                disabled={!canPause}
                className={cn(canPause && "text-amber-400 hover:bg-amber-500/20")}
              >
                <Pause className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            {/* Stop */}
            <Tooltip content="Stop">
              <IconButton
                size="sm"
                onClick={stop}
                disabled={!canStop}
                className={cn(canStop && "text-red-400 hover:bg-red-500/20")}
              >
                <Square className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            {/* Skip */}
            <Tooltip content="Skip Current">
              <IconButton
                size="sm"
                onClick={skipCurrent}
                disabled={!canSkip}
                className={cn(canSkip && "text-blue-400 hover:bg-blue-500/20")}
              >
                <SkipForward className="h-4 w-4" />
              </IconButton>
            </Tooltip>
          </div>

          {/* Right: Stats, Settings, Close */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="text-green-400">{totalCompleted} done</span>
              <span className="text-border">·</span>
              <span>{totalQueued} queued</span>
            </div>

            <div className="h-6 w-px bg-border" />

            <Tooltip content="Settings">
              <IconButton size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            <IconButton size="sm" onClick={closePopup}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* Main Content - Kanban Board */}
        <div className="flex-1 overflow-hidden p-4">
          <AutoBuildKanban issues={issues} />
        </div>

        {/* Bottom Console - Activity Log */}
        <div className="h-48 shrink-0 border-t border-border bg-[#0d0d0d]">
          <AutoBuildLog />
        </div>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <AutoBuildSettingsPopup onClose={() => setShowSettings(false)} />
      )}
    </div>,
    document.body
  );
}

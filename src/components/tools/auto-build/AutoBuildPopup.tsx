import { useEffect, useCallback, useState } from "react";
import { X, Bot, Play, Pause, Square, SkipForward, Settings, HelpCircle, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { useBeadsStore } from "@/stores/beadsStore";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui";
import { AutoBuildKanban } from "./AutoBuildKanban";
import { AutoBuildLog } from "./AutoBuildLog";
import { AutoBuildSettingsPopup } from "./AutoBuildSettingsPopup";
import { AutoBuildHelpPopup } from "./AutoBuildHelpPopup";
import { autoBuildGameBridge } from "@/services/autoBuildGameBridge";
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
  const [showHelp, setShowHelp] = useState(false);
  const [beadsInitialized, setBeadsInitialized] = useState<boolean | null>(null);

  // Initialize on mount
  useEffect(() => {
    setProjectPath(projectPath);
    setBeadsProjectPath(projectPath);

    // Check if beads is initialized
    invoke<boolean>("beads_has_init", { projectPath })
      .then((hasInit) => {
        setBeadsInitialized(hasInit);
        if (hasInit) {
          fetchIssues();
          loadSession();
        }
      })
      .catch(() => setBeadsInitialized(false));
  }, [projectPath, setProjectPath, setBeadsProjectPath, fetchIssues, loadSession]);

  // Cache issues in autoBuildStore
  useEffect(() => {
    const { cacheIssue } = useAutoBuildStore.getState();
    issues.forEach((issue) => cacheIssue(issue));
  }, [issues]);

  // Start/stop game bridge based on auto build status
  useEffect(() => {
    if (status === "running") {
      autoBuildGameBridge.start();
    } else {
      autoBuildGameBridge.stop();
    }
    return () => {
      autoBuildGameBridge.stop();
    };
  }, [status]);

  // Filter queue to only include issues that are still open
  useEffect(() => {
    if (issues.length === 0) return;

    const { queue, removeFromQueue } = useAutoBuildStore.getState();
    const openIssueIds = new Set(issues.filter((i) => i.status === "open").map((i) => i.id));

    // Remove any queued issues that are no longer open
    queue.forEach((id) => {
      if (!openIssueIds.has(id)) {
        removeFromQueue(id);
      }
    });
  }, [issues]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSettings) {
          setShowSettings(false);
        } else if (showHelp) {
          setShowHelp(false);
        } else {
          closePopup();
        }
      }
    },
    [closePopup, showSettings, showHelp]
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

            <Tooltip content="How it works">
              <IconButton size="sm" onClick={() => setShowHelp(true)}>
                <HelpCircle className="h-4 w-4" />
              </IconButton>
            </Tooltip>

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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-4">
          {beadsInitialized === false ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-400" />
                <h2 className="text-xl font-semibold text-amber-200">Beads Not Initialized</h2>
                <p className="text-text-secondary">
                  Auto Build requires <strong className="text-text-primary">Beads</strong> issue tracking to manage work items.
                  Beads is part of the <strong className="text-text-primary">farmwork</strong> CLI suite.
                </p>
                <div className="mt-2 rounded-md bg-bg-primary px-4 py-3 font-mono text-sm">
                  <span className="text-text-secondary"># Install farmwork, then run:</span>
                  <br />
                  <span className="text-green-400">bd init</span>
                </div>
                <p className="text-sm text-text-secondary">
                  Run this command in your project root to initialize Beads.
                </p>
              </div>
            </div>
          ) : (
            <AutoBuildKanban issues={issues} />
          )}
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

      {/* Help Popup */}
      {showHelp && (
        <AutoBuildHelpPopup onClose={() => setShowHelp(false)} />
      )}
    </div>,
    document.body
  );
}

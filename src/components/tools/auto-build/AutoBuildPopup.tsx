import { useEffect, useCallback, useState } from "react";
import { X, Bot, Play, Pause, Square, SkipForward, Settings, HelpCircle, AlertTriangle, Terminal, Copy, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { useBeadsStore } from "@/stores/beadsStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { useProjectStore } from "@/stores";
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
  const { createSession } = useSessionStore();
  const { queueCommand } = useTerminalStore();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [beadsInitialized, setBeadsInitialized] = useState<boolean | null>(null);
  const [beadsInstalled, setBeadsInstalled] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  // Get the appropriate command based on beads installation status
  const getCommand = useCallback(() => {
    return beadsInstalled
      ? "bd init"
      : "curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash";
  }, [beadsInstalled]);

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
    closePopup();
  };

  // Initialize on mount
  useEffect(() => {
    setProjectPath(projectPath);
    setBeadsProjectPath(projectPath);

    // First check if beads CLI is installed globally
    invoke<boolean>("validate_mcp_command", { command: "bd" })
      .then((isInstalled) => {
        setBeadsInstalled(isInstalled);
      })
      .catch(() => setBeadsInstalled(false));

    // Check if beads is initialized in this project
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
                aria-label={isPaused ? "Resume build" : "Start build"}
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
                aria-label="Pause build"
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
                aria-label="Stop build"
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
                aria-label="Skip current issue"
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
              <IconButton size="sm" onClick={() => setShowHelp(true)} aria-label="Show help">
                <HelpCircle className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            <Tooltip content="Settings">
              <IconButton size="sm" onClick={() => setShowSettings(true)} aria-label="Show settings">
                <Settings className="h-4 w-4" />
              </IconButton>
            </Tooltip>

            <IconButton size="sm" onClick={closePopup} aria-label="Close">
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
                <h2 className="text-xl font-semibold text-amber-200">
                  {beadsInstalled ? "Beads Not Initialized" : "Beads Not Installed"}
                </h2>
                <p className="text-text-secondary">
                  Auto Build requires <strong className="text-text-primary">Beads</strong> issue tracking to manage work items.
                </p>
                {beadsInstalled ? (
                  <p className="text-sm text-text-secondary">
                    Beads is installed. Initialize it in this project to start tracking issues.
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Install Beads first, then run <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">bd init</code> to initialize.
                  </p>
                )}

                {/* Terminal-style code block */}
                <div className="w-full max-w-sm">
                  <div className="flex items-center justify-between bg-[#0a0a0a] rounded-lg border border-neutral-800 px-4 py-3">
                    <code className="text-sm font-mono text-text-primary overflow-hidden text-ellipsis">
                      <span className="text-text-secondary">$ </span>
                      {getCommand()}
                    </code>
                    <button
                      onClick={handleCopyCommand}
                      className="ml-3 p-1.5 rounded hover:bg-bg-tertiary transition-colors flex-shrink-0"
                      title="Copy command"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleRunCommand}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>{beadsInstalled ? "Initialize in Terminal" : "Install in Terminal"}</span>
                  </button>
                </div>
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

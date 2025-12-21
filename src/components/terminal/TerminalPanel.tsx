import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as TerminalIcon, X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";
import { Terminal } from "./Terminal";
import { useTerminalStore } from "@/stores/terminalStore";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  projectId: string;
  projectPath: string;
}

const MIN_HEIGHT = 100;
const MAX_HEIGHT_RATIO = 0.8;
const DEFAULT_HEIGHT = 200;

export function TerminalPanel({ projectId, projectPath }: TerminalPanelProps) {
  const { getTerminalState, closeTerminal, setHeight, setPtyId, toggleMaximize, setMaximized } = useTerminalStore();
  const terminalState = getTerminalState(projectId);
  const [isResizing, setIsResizing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [heightBeforeMaximize, setHeightBeforeMaximize] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handlePtyCreated = useCallback(
    (ptyId: string) => {
      setPtyId(projectId, ptyId);
    },
    [projectId, setPtyId]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    // Exit maximized mode when user starts resizing
    if (terminalState.isMaximized) {
      setMaximized(projectId, false);
    }
  }, [terminalState.isMaximized, projectId, setMaximized]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = panelRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const maxHeight = containerRect.height * MAX_HEIGHT_RATIO;
      const newHeight = containerRect.bottom - e.clientY;
      setHeight(projectId, Math.min(maxHeight, Math.max(MIN_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, projectId, setHeight]);

  const handleMaximize = useCallback(() => {
    if (!terminalState.isMaximized) {
      // Store current height before maximizing
      setHeightBeforeMaximize(terminalState.height || DEFAULT_HEIGHT);
    }
    toggleMaximize(projectId);
  }, [terminalState.isMaximized, terminalState.height, projectId, toggleMaximize]);

  const handleMinimize = useCallback(() => {
    // Restore previous height when minimizing
    if (heightBeforeMaximize !== null) {
      setHeight(projectId, heightBeforeMaximize);
    }
    setMaximized(projectId, false);
  }, [heightBeforeMaximize, projectId, setHeight, setMaximized]);

  const handleCloseClick = useCallback(async () => {
    // Check if PTY is active
    if (terminalState.ptyId) {
      try {
        const isActive = await invoke<boolean>("is_pty_active", { ptyId: terminalState.ptyId });
        if (isActive) {
          setShowCloseConfirm(true);
          return;
        }
      } catch {
        // If check fails, just close
      }
    }
    closeTerminal(projectId);
  }, [terminalState.ptyId, projectId, closeTerminal]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    closeTerminal(projectId);
  }, [projectId, closeTerminal]);

  const handleCancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  if (!terminalState.isOpen) return null;

  // Calculate height - if maximized, use percentage of parent
  const panelHeight = terminalState.isMaximized ? "80%" : (terminalState.height || DEFAULT_HEIGHT);

  return (
    <div
      ref={panelRef}
      className="flex-shrink-0 border-t border-border bg-bg-secondary overflow-hidden flex flex-col"
      style={{ height: panelHeight }}
    >
      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-secondary border border-border rounded-lg p-4 shadow-xl max-w-sm mx-4">
            <h3 className="text-sm font-medium text-text-primary mb-2">Close Terminal?</h3>
            <p className="text-xs text-text-secondary mb-4">
              There may be a running process in this terminal. Are you sure you want to close it?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelClose}
                className="px-3 py-1.5 text-xs rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-3 py-1.5 text-xs rounded bg-accent-red/20 hover:bg-accent-red/30 text-accent-red transition-colors"
              >
                Close Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={resizeRef}
        className={cn(
          "flex items-center justify-center h-2 cursor-row-resize",
          "hover:bg-accent/10 transition-colors",
          isResizing && "bg-accent/20",
          terminalState.isMaximized && "cursor-default"
        )}
        onMouseDown={terminalState.isMaximized ? undefined : handleMouseDown}
      >
        <GripHorizontal className="w-4 h-4 text-text-secondary" />
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-bg-tertiary/50">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          {terminalState.isMaximized ? (
            <button
              onClick={handleMinimize}
              className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              title="Restore"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleMaximize}
              className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              title="Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCloseClick}
            className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            title="Close terminal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Terminal
          key={`panel-${projectId}`}
          projectPath={projectPath}
          ptyId={terminalState.ptyId}
          onPtyCreated={handlePtyCreated}
        />
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { usePanelStore } from "@/stores/panelStore";
import { useSessionStore } from "@/stores/sessionStore";
import { PanelHeader } from "./PanelHeader";
import { PanelContent } from "./PanelContent";
import { PanelCloseConfirmDialog } from "./PanelCloseConfirmDialog";
import { requiresCloseProtection } from "./panelRegistry";
import type { PanelState, PanelType, PanelCloseCheck } from "@/types/panel";

interface PanelProps {
  panel: PanelState;
  projectId: string;
  projectPath: string;
  sessionId?: string;
}

export function Panel({ panel, projectId, projectPath, sessionId }: PanelProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  const { changePanelType, focusPanel, updatePanel, setProcessRunning } = usePanelStore();
  const getStreamingState = useSessionStore((s) => s.getStreamingState);

  const handleFocus = useCallback(() => {
    focusPanel(projectId, panel.id, sessionId);
  }, [projectId, panel.id, sessionId, focusPanel]);

  const handleTypeChange = useCallback(
    (newType: PanelType) => {
      changePanelType(projectId, panel.id, newType, sessionId);
    },
    [projectId, panel.id, sessionId, changePanelType]
  );

  const checkSafeToClose = useCallback(async (): Promise<PanelCloseCheck> => {
    // Check if panel type requires protection
    if (!requiresCloseProtection(panel.type)) {
      return { safe: true };
    }

    // Check terminal PTY
    if (panel.type === "terminal" && panel.terminalPtyId) {
      try {
        const isActive = await invoke<boolean>("is_pty_active", {
          ptyId: panel.terminalPtyId,
        });
        if (isActive) {
          return {
            safe: false,
            reason: "There may be a running process in this terminal.",
          };
        }
      } catch {
        // If check fails, assume it's safe
      }
    }

    // Check streaming Claude response
    if (panel.type === "claude-output" && panel.sessionId) {
      const streamingState = getStreamingState(panel.sessionId);
      if (streamingState?.isStreaming) {
        return {
          safe: false,
          reason: "Claude is currently streaming a response.",
        };
      }
    }

    // Check explicit hasRunningProcess flag
    if (panel.hasRunningProcess) {
      return {
        safe: false,
        reason: "This panel has an active process running.",
      };
    }

    return { safe: true };
  }, [panel, getStreamingState]);

  const handleClose = useCallback(async () => {
    const check = await checkSafeToClose();
    if (!check.safe) {
      setCloseReason(check.reason || "Panel has an active process.");
      setShowCloseConfirm(true);
      return;
    }
    // Set panel to empty state so user can choose new type
    changePanelType(projectId, panel.id, "empty", sessionId);
  }, [checkSafeToClose, projectId, panel.id, sessionId, changePanelType]);

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    changePanelType(projectId, panel.id, "empty", sessionId);
  }, [projectId, panel.id, sessionId, changePanelType]);

  const handleCancelClose = useCallback(() => {
    setShowCloseConfirm(false);
  }, []);

  const handleProcessStateChange = useCallback(
    (running: boolean) => {
      setProcessRunning(projectId, panel.id, running, sessionId);
    },
    [projectId, panel.id, sessionId, setProcessRunning]
  );

  const handlePanelUpdate = useCallback(
    (updates: Partial<PanelState>) => {
      updatePanel(projectId, panel.id, updates, sessionId);
    },
    [projectId, panel.id, sessionId, updatePanel]
  );

  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden",
        "bg-bg-secondary border",
        panel.isFocused ? "border-accent/30" : "border-border/30"
      )}
      onClick={handleFocus}
    >
      <PanelHeader
        panel={panel}
        onTypeChange={handleTypeChange}
        onClose={handleClose}
        isFocused={panel.isFocused}
      />

      <div className="flex-1 overflow-hidden relative">
        <PanelContent
          panelId={panel.id}
          projectId={projectId}
          projectPath={projectPath}
          panel={panel}
          isFocused={panel.isFocused}
          onProcessStateChange={handleProcessStateChange}
          onPanelUpdate={handlePanelUpdate}
        />

        <PanelCloseConfirmDialog
          isOpen={showCloseConfirm}
          panelType={panel.type}
          reason={closeReason}
          onConfirm={handleConfirmClose}
          onCancel={handleCancelClose}
        />
      </div>
    </div>
  );
}

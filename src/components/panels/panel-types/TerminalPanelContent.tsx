import { useCallback, useEffect } from "react";
import { Terminal } from "@/components/terminal/Terminal";
import type { PanelContentProps } from "@/types/panel";

export function TerminalPanelContent({
  panelId,
  projectId: _projectId,
  projectPath,
  panel,
  isFocused,
  onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const handlePtyCreated = useCallback(
    (ptyId: string) => {
      onPanelUpdate({ terminalPtyId: ptyId });
      // Assume terminal has a running process once PTY is created
      onProcessStateChange(true);
    },
    [onPanelUpdate, onProcessStateChange]
  );

  // Clear process running state when component unmounts
  useEffect(() => {
    return () => {
      onProcessStateChange(false);
    };
  }, [onProcessStateChange]);

  return (
    <div className="h-full w-full overflow-hidden">
      <Terminal
        key={`panel-terminal-${panelId}`}
        projectPath={projectPath}
        ptyId={panel.terminalPtyId ?? null}
        onPtyCreated={handlePtyCreated}
        isVisible={isFocused}
      />
    </div>
  );
}

import { FolderOpen, Terminal as TerminalIcon, LayoutGrid, Columns, Trash2, Zap, ListTree } from "lucide-react";
import { ProviderDropdown } from "@/components/provider/ProviderDropdown";
import { ModelSelector } from "@/components/model/ModelSelector";
import { PermissionModeToggle, StartButton } from "@/components/session";
import { Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AIProvider, PermissionMode, Session } from "@/types";

interface MainContentHeaderProps {
  projectPath: string;
  projectId: string;
  currentSession: Session | undefined;
  isSessionStarting: boolean;
  isSessionActive: boolean;
  isTerminalSession: boolean;
  useMultiPanelLayout: boolean;
  sidebarCollapsed: boolean;
  sidebarPosition: "left" | "right";
  installedProviders: AIProvider[];
  onStart: () => void;
  onStop: () => void;
  onProviderChange: (provider: AIProvider) => void;
  onModeChange: (mode: PermissionMode) => void;
  onToggleTerminal: () => void;
  onTogglePanelLayout: () => void;
  onClearContext?: () => void;
}

export function MainContentHeader({
  projectPath,
  projectId,
  currentSession,
  isSessionStarting,
  isSessionActive,
  isTerminalSession,
  useMultiPanelLayout,
  sidebarCollapsed,
  sidebarPosition,
  installedProviders,
  onStart,
  onStop,
  onProviderChange,
  onModeChange,
  onToggleTerminal,
  onTogglePanelLayout,
  onClearContext,
}: MainContentHeaderProps) {
  const { streamingEnabled, setStreamingEnabled, inlineToolView, setInlineToolView } = useSettingsStore();
  return (
    <div className="h-[45px] px-4 flex items-center justify-between border-b border-border bg-bg-secondary" data-tauri-drag-region>
      <div
        className="flex items-center gap-2 text-sm text-text-secondary transition-[padding] duration-200 flex-1 min-w-0 overflow-hidden pr-6"
        data-tauri-drag-region
        style={{ paddingLeft: sidebarPosition === "left" ? (sidebarCollapsed ? 28 : 16) : 0 }}
      >
        <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" data-tauri-drag-region />
        <span className="font-mono truncate min-w-0" data-tauri-drag-region>{projectPath}</span>
      </div>
      <div
        className="flex items-center gap-2 transition-[padding] duration-200"
        style={{ paddingRight: sidebarPosition === "right" ? (sidebarCollapsed ? 28 : 16) : 0 }}
      >
        {currentSession && currentSession.type === "claude" && !useMultiPanelLayout && (
          <StartButton
            onStart={onStart}
            onStop={onStop}
            onProviderChange={onProviderChange}
            currentProvider={currentSession.provider}
            installedProviders={installedProviders}
            isStarting={isSessionStarting}
            isActive={isSessionActive}
          />
        )}
        <ModelSelector projectId={projectId} />
        {currentSession && (
          <PermissionModeToggle
            mode={currentSession.permissionMode || "default"}
            onChange={onModeChange}
            provider={currentSession.provider}
          />
        )}
        <div className="w-px h-5 bg-border" />
        <Tooltip content={streamingEnabled ? "Stream responses (click to batch)" : "Batch responses (click to stream)"} side="bottom">
          <button
            onClick={() => setStreamingEnabled(!streamingEnabled)}
            className={cn(
              "p-1.5 rounded transition-colors",
              streamingEnabled
                ? "text-accent hover:bg-accent/10"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
          >
            <Zap className={cn("w-4 h-4", !streamingEnabled && "opacity-50")} />
          </button>
        </Tooltip>
        <Tooltip content={inlineToolView ? "Inline tools (click for panel)" : "Panel tools (click for inline)"} side="bottom">
          <button
            onClick={() => setInlineToolView(!inlineToolView)}
            className={cn(
              "p-1.5 rounded transition-colors",
              inlineToolView
                ? "text-accent hover:bg-accent/10"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
          >
            <ListTree className={cn("w-4 h-4", !inlineToolView && "opacity-50")} />
          </button>
        </Tooltip>
        <ProviderDropdown provider={currentSession?.provider || "claude"} projectPath={projectPath} />
        {!isTerminalSession && !useMultiPanelLayout && (
          <>
            <Tooltip content="Quick Terminal" side="bottom">
              <button
                onClick={onToggleTerminal}
                className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <TerminalIcon className="w-4 h-4" />
              </button>
            </Tooltip>
            {onClearContext && (
              <Tooltip content="Clear Context" side="bottom">
                <button
                  onClick={onClearContext}
                  className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </>
        )}
        <Tooltip content={useMultiPanelLayout ? "Exit Panel Mode" : "Panel Layout"} side="bottom">
          <button
            onClick={onTogglePanelLayout}
            className={cn(
              "p-1.5 rounded transition-colors",
              useMultiPanelLayout
                ? "bg-accent/20 text-accent hover:bg-accent/30"
                : "hover:bg-bg-tertiary text-text-secondary hover:text-text-primary"
            )}
          >
            {useMultiPanelLayout ? <Columns className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

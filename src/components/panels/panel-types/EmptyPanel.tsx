import { MessageSquare, Terminal, FolderOpen, FileCode, FileText, Tractor, Globe, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelContentProps, PanelType } from "@/types/panel";

const PANEL_OPTIONS: { type: PanelType; name: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    type: "claude-output",
    name: "Session GUI",
    icon: MessageSquare,
    description: "AI session view",
  },
  {
    type: "terminal",
    name: "Terminal",
    icon: Terminal,
    description: "Command line",
  },
  {
    type: "file-browser",
    name: "Files",
    icon: FolderOpen,
    description: "Browse files",
  },
  {
    type: "file-viewer",
    name: "Viewer",
    icon: FileCode,
    description: "Files, audio, video, playlists",
  },
  {
    type: "markdown-viewer",
    name: "Markdown",
    icon: FileText,
    description: "View & edit .md",
  },
  {
    type: "farmwork-stats",
    name: "Farmwork",
    icon: Tractor,
    description: "Project stats & audits",
  },
  {
    type: "browser-preview",
    name: "Browser",
    icon: Globe,
    description: "Web preview",
  },
  {
    type: "youtube-embed",
    name: "YouTube",
    icon: Youtube,
    description: "Watch videos",
  },
];

export function EmptyPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath: _projectPath,
  sessionId: _sessionId,
  panel: _panel,
  isFocused: _isFocused,
  disabledTypes = [],
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const handleSelectType = (type: PanelType) => {
    onPanelUpdate({ type });
  };

  const isTypeDisabled = (type: PanelType): boolean => {
    return disabledTypes.includes(type);
  };

  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className="mb-3">
        <p className="text-[11px] uppercase tracking-wider text-text-secondary/50 font-medium">
          Select Panel Type
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {PANEL_OPTIONS.map(({ type, name, icon: Icon, description }) => {
          const isDisabled = isTypeDisabled(type);
          return (
            <button
              key={type}
              onClick={() => !isDisabled && handleSelectType(type)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-md",
                "transition-colors",
                "text-left group",
                isDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-bg-hover"
              )}
              title={isDisabled ? "Only one allowed per session" : undefined}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0 transition-colors",
                isDisabled
                  ? "text-text-secondary/60"
                  : "text-text-secondary/60 group-hover:text-accent"
              )} />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-text-primary truncate">{name}</span>
                <span className="text-[10px] text-text-secondary/40 truncate hidden sm:inline">
                  {description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

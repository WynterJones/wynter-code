import { MessageSquare, Terminal, FileCode, Globe, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelContentProps, PanelType } from "@/types/panel";

const PANEL_OPTIONS: { type: PanelType; name: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  {
    type: "claude-output",
    name: "Claude Output",
    icon: MessageSquare,
    description: "AI conversation and responses",
  },
  {
    type: "terminal",
    name: "Terminal",
    icon: Terminal,
    description: "Command line interface",
  },
  {
    type: "file-viewer",
    name: "File Viewer",
    icon: FileCode,
    description: "Preview files from your project",
  },
  {
    type: "browser-preview",
    name: "Browser Preview",
    icon: Globe,
    description: "Embedded web browser",
  },
];

export function EmptyPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath: _projectPath,
  panel: _panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const handleSelectType = (type: PanelType) => {
    onPanelUpdate({ type });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-bg-tertiary/50 mb-4">
        <Plus className="w-6 h-6 text-text-secondary/50" />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">Empty Panel</h3>
      <p className="text-xs text-text-secondary mb-6 text-center">
        Choose what to display in this panel
      </p>

      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
        {PANEL_OPTIONS.map(({ type, name, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => handleSelectType(type)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg",
              "bg-bg-tertiary/30 hover:bg-bg-tertiary/60 border border-border/30",
              "hover:border-accent/30 transition-all",
              "text-left group"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-bg-secondary group-hover:bg-accent/10 transition-colors">
              <Icon className="w-4 h-4 text-text-secondary group-hover:text-accent transition-colors" />
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-text-primary">{name}</div>
              <div className="text-[10px] text-text-secondary/70 mt-0.5 line-clamp-2">
                {description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

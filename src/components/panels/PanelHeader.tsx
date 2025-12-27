import { useState } from "react";
import {
  X,
  ChevronDown,
  MessageSquare,
  Terminal,
  FolderOpen,
  FileCode,
  FileText,
  Globe,
  Youtube,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelType, PanelState } from "@/types/panel";
import { getPanelTypeConfig, getPanelTypeList } from "./panelRegistry";

const PANEL_ICONS: Record<PanelType, React.ComponentType<{ className?: string }>> = {
  empty: Plus,
  "claude-output": MessageSquare,
  terminal: Terminal,
  "file-browser": FolderOpen,
  "file-viewer": FileCode,
  "markdown-viewer": FileText,
  "browser-preview": Globe,
  "youtube-embed": Youtube,
};

interface PanelHeaderProps {
  panel: PanelState;
  onTypeChange: (type: PanelType) => void;
  onClose: () => void;
  isFocused: boolean;
}

export function PanelHeader({ panel, onTypeChange, onClose, isFocused }: PanelHeaderProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const config = getPanelTypeConfig(panel.type);
  const Icon = PANEL_ICONS[panel.type] || Plus;
  const title = panel.title || config.defaultTitle;
  const isEmptyPanel = panel.type === "empty";

  // Filter out "empty" from the type list since users select via X button
  const selectableTypes = getPanelTypeList().filter((t) => t.id !== "empty");

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1 border-b",
        "bg-bg-tertiary/50",
        isFocused ? "border-accent/30" : "border-border/50"
      )}
    >
      {/* Left: Type selector (or just title for empty panels) */}
      <div className="relative">
        {isEmptyPanel ? (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-text-secondary">
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{title}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className={cn(
              "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs",
              "hover:bg-bg-hover transition-colors",
              "text-text-secondary hover:text-text-primary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{title}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {/* Type selector dropdown */}
        {showTypeSelector && !isEmptyPanel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTypeSelector(false)}
            />
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg-secondary border border-border rounded-md shadow-lg py-1 min-w-[140px]">
              {selectableTypes.map((typeConfig) => {
                const TypeIcon = PANEL_ICONS[typeConfig.id];
                const isActive = typeConfig.id === panel.type;
                return (
                  <button
                    key={typeConfig.id}
                    onClick={() => {
                      onTypeChange(typeConfig.id);
                      setShowTypeSelector(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left",
                      "hover:bg-bg-hover transition-colors",
                      isActive
                        ? "text-accent bg-accent/10"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <TypeIcon className="w-3.5 h-3.5" />
                    <span>{typeConfig.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Close button (hidden for empty panels) */}
      {!isEmptyPanel && (
        <button
          onClick={onClose}
          className={cn(
            "p-0.5 rounded",
            "hover:bg-bg-hover transition-colors",
            "text-text-secondary hover:text-text-primary"
          )}
          title="Clear panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

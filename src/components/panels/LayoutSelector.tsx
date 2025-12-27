import { useState } from "react";
import {
  ChevronDown,
  Square,
  Columns2,
  Rows2,
  Columns3,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  TerminalSquare,
} from "lucide-react";
import { usePanelStore } from "@/stores/panelStore";
import { getLayoutTemplateList } from "./layoutTemplates";
import { cn } from "@/lib/utils";
import type { LayoutTemplateId } from "@/types/panel";

const LAYOUT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Square,
  Columns2,
  Rows2,
  Columns3,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  TerminalSquare,
};

interface LayoutSelectorProps {
  projectId: string;
  sessionId?: string;
  activeTemplateId: LayoutTemplateId;
}

export function LayoutSelector({ projectId, sessionId, activeTemplateId }: LayoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const setLayoutTemplate = usePanelStore((s) => s.setLayoutTemplate);
  const templates = getLayoutTemplateList();

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);
  const ActiveIcon = activeTemplate ? LAYOUT_ICONS[activeTemplate.icon] : Square;

  const handleSelect = (templateId: LayoutTemplateId) => {
    setLayoutTemplate(projectId, templateId, sessionId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
          "hover:bg-bg-hover transition-colors",
          "text-text-secondary hover:text-text-primary"
        )}
      >
        <ActiveIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{activeTemplate?.name || "Layout"}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 bg-bg-secondary border border-border rounded-lg shadow-xl py-1.5 min-w-[180px]">
            <div className="px-3 py-1 text-[10px] font-medium text-text-secondary/60 uppercase tracking-wider">
              Layout Templates
            </div>
            <div className="mt-1">
              {templates.map((template) => {
                const Icon = LAYOUT_ICONS[template.icon] || Square;
                const isActive = template.id === activeTemplateId;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-1.5 text-left",
                      "hover:bg-bg-hover transition-colors",
                      isActive
                        ? "text-accent bg-accent/10"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{template.name}</div>
                      <div className="text-[10px] text-text-secondary/60 truncate">
                        {template.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

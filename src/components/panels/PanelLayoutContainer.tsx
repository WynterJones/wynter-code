import { usePanelStore } from "@/stores/panelStore";
import { LayoutNode } from "./LayoutNode";
import { LayoutSelector } from "./LayoutSelector";

interface PanelLayoutContainerProps {
  projectId: string;
  projectPath: string;
}

export function PanelLayoutContainer({ projectId, projectPath }: PanelLayoutContainerProps) {
  const layoutState = usePanelStore((s) => s.getLayoutForProject(projectId));

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Layout selector toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-bg-tertiary/30">
        <div className="text-xs text-text-secondary">
          Layout
        </div>
        <LayoutSelector
          projectId={projectId}
          activeTemplateId={layoutState.activeTemplateId}
        />
      </div>

      {/* Layout content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LayoutNode
          node={layoutState.layout}
          projectId={projectId}
          projectPath={projectPath}
          panels={layoutState.panels}
        />
      </div>
    </div>
  );
}

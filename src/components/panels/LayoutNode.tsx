import { useCallback, useRef } from "react";
import { SplitResizer } from "./SplitResizer";
import { Panel } from "./Panel";
import { usePanelStore } from "@/stores/panelStore";
import { cn } from "@/lib/utils";
import type { LayoutNode as LayoutNodeType, PanelState } from "@/types/panel";

interface LayoutNodeProps {
  node: LayoutNodeType;
  projectId: string;
  projectPath: string;
  panels: Record<string, PanelState>;
}

export function LayoutNode({ node, projectId, projectPath, panels }: LayoutNodeProps) {
  const setSplitRatio = usePanelStore((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (delta: number) => {
      if (node.type !== "split" || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const totalSize = node.direction === "horizontal" ? rect.width : rect.height;

      // Calculate new ratio based on delta
      const currentRatio = node.splitRatio ?? 0.5;
      const deltaRatio = delta / totalSize;
      const newRatio = Math.max(0.1, Math.min(0.9, currentRatio + deltaRatio));

      setSplitRatio(projectId, node.id, newRatio);
    },
    [node, projectId, setSplitRatio]
  );

  const handleResizeEnd = useCallback(() => {
    // Could trigger save here if needed
  }, []);

  // Render a panel leaf node
  if (node.type === "panel") {
    const panel = node.panelId ? panels[node.panelId] : undefined;
    if (!panel) {
      return (
        <div className="flex-1 flex items-center justify-center bg-bg-secondary text-text-secondary text-sm">
          Panel not found
        </div>
      );
    }

    return (
      <Panel
        panel={panel}
        projectId={projectId}
        projectPath={projectPath}
      />
    );
  }

  // Render a split node with two children
  if (node.type === "split" && node.children) {
    const [first, second] = node.children;
    const ratio = node.splitRatio ?? 0.5;
    const isHorizontal = node.direction === "horizontal";

    // Calculate sizes as percentages
    const firstSize = `${ratio * 100}%`;
    const secondSize = `${(1 - ratio) * 100}%`;

    return (
      <div
        ref={containerRef}
        className={cn(
          "flex flex-1 min-h-0 min-w-0 overflow-hidden",
          isHorizontal ? "flex-row" : "flex-col"
        )}
      >
        <div
          className="overflow-hidden flex min-h-0 min-w-0"
          style={{
            [isHorizontal ? "width" : "height"]: firstSize,
            [isHorizontal ? "height" : "width"]: "100%",
            flexShrink: 0,
          }}
        >
          <LayoutNode
            node={first}
            projectId={projectId}
            projectPath={projectPath}
            panels={panels}
          />
        </div>

        <SplitResizer
          direction={node.direction ?? "horizontal"}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
        />

        <div
          className="overflow-hidden flex flex-1 min-h-0 min-w-0"
          style={{
            [isHorizontal ? "width" : "height"]: secondSize,
            [isHorizontal ? "height" : "width"]: "100%",
          }}
        >
          <LayoutNode
            node={second}
            projectId={projectId}
            projectPath={projectPath}
            panels={panels}
          />
        </div>
      </div>
    );
  }

  return null;
}

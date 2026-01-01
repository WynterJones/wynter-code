import { useCallback } from "react";
import type { Graphics } from "pixi.js";
import { navigationSystem } from "./navigation/NavigationSystem";
import type { Building, NavGraph } from "../types";

export function useTycoonNavigation(
  showDebug: boolean,
  navGraph: NavGraph | null,
  buildings: Building[],
  setNavGraph: (graph: NavGraph) => void
) {
  const initializeNavigation = useCallback(async () => {
    if (!navigationSystem.isInitialized()) {
      const graph = await navigationSystem.initialize("tycoon/map-mask.png", 16);
      setNavGraph(graph);
    }
  }, [setNavGraph]);

  const drawDebugOverlay = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      if (!showDebug) {
        return;
      }

      // Draw walkable grid cells (road areas)
      const grid = navigationSystem.getGrid();
      if (grid) {
        for (let gy = 0; gy < grid.rows; gy++) {
          for (let gx = 0; gx < grid.cols; gx++) {
            if (grid.isWalkable(gx, gy)) {
              const px = gx * grid.cellSize;
              const py = gy * grid.cellSize;
              graphics.rect(px, py, grid.cellSize, grid.cellSize);
              graphics.fill({ color: 0xffff00, alpha: 0.3 });
            }
          }
        }
      }

      if (!navGraph) return;

      // Draw path connections (thicker, more visible)
      for (const node of navGraph.nodes.values()) {
        for (const neighborId of node.neighbors) {
          const neighbor = navGraph.nodes.get(neighborId);
          if (neighbor) {
            graphics.moveTo(node.x, node.y);
            graphics.lineTo(neighbor.x, neighbor.y);
            graphics.stroke({ color: 0x00ff00, width: 3, alpha: 0.7 });
          }
        }
      }

      // Draw navigation nodes
      for (const node of navGraph.nodes.values()) {
        graphics.circle(node.x, node.y, 5);
        graphics.fill(0x00ff00);
      }

      // Draw building dock positions (where vehicles stop)
      for (const building of buildings) {
        const pos = building.position;
        graphics.circle(pos.dockX, pos.dockY, 8);
        graphics.fill(0xff00ff);
        graphics.stroke({ color: 0xffffff, width: 2 });
      }
    },
    [showDebug, navGraph, buildings]
  );

  return {
    initializeNavigation,
    drawDebugOverlay,
  };
}

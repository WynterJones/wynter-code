import type { Grid, NavGraph, NavNode, Point } from "../../types";
import { maskToGrid } from "./maskToGrid";
import { gridToGraph, findNearestNode } from "./gridToGraph";
import { aStar } from "./aStar";
import { pathToWaypoints, smoothPath } from "./pathToWaypoints";
import { getRandomRoadNode } from "./snap";

export class NavigationSystem {
  private grid: Grid | null = null;
  private graph: NavGraph | null = null;
  private initialized = false;

  async initialize(maskUrl: string, cellSize = 16): Promise<NavGraph> {
    this.grid = await maskToGrid(maskUrl, cellSize, 200);
    this.graph = gridToGraph(this.grid);
    this.initialized = true;
    return this.graph;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getGraph(): NavGraph | null {
    return this.graph;
  }

  getGrid(): Grid | null {
    return this.grid;
  }

  findPath(from: Point, to: Point, jitter = 0.1): Point[] | null {
    if (!this.graph) {
      console.warn("[Nav] No graph available");
      return null;
    }

    const startNode = findNearestNode(this.graph, from.x, from.y);
    const endNode = findNearestNode(this.graph, to.x, to.y);

    if (!startNode) {
      console.warn(`[Nav] No start node found near (${from.x.toFixed(0)}, ${from.y.toFixed(0)})`);
      return null;
    }
    if (!endNode) {
      console.warn(`[Nav] No end node found near (${to.x.toFixed(0)}, ${to.y.toFixed(0)})`);
      return null;
    }

    const nodePath = aStar(this.graph, startNode.id, endNode.id, { jitter });
    if (!nodePath) {
      console.warn(`[Nav] A* found no path from ${startNode.id} to ${endNode.id}`);
      return null;
    }

    const waypoints = pathToWaypoints(nodePath, this.graph);
    return smoothPath(waypoints, 0.3);
  }

  snapToRoad(point: Point): Point | null {
    if (!this.graph) return null;
    const node = findNearestNode(this.graph, point.x, point.y);
    return node ? { x: node.x, y: node.y } : null;
  }

  getRandomRoadPoint(): Point | null {
    if (!this.graph) return null;
    const node = getRandomRoadNode(this.graph);
    return node ? { x: node.x, y: node.y } : null;
  }

  getNearestNode(point: Point): NavNode | null {
    if (!this.graph) return null;
    return findNearestNode(this.graph, point.x, point.y);
  }
}

export const navigationSystem = new NavigationSystem();

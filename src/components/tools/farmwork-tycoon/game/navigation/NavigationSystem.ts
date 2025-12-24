import type { Grid, NavGraph, NavNode, Point } from "../../types";
import { maskToGrid } from "./maskToGrid";
import { gridToGraph, findNearestNode } from "./gridToGraph";
import { aStar } from "./aStar";
import { pathToWaypoints, smoothPath } from "./pathToWaypoints";
import { getRandomRoadNode } from "./snap";
import { SPAWN_POINTS, getSpawnPointById, type SpawnPoint } from "./SpawnPoints";

export class NavigationSystem {
  private grid: Grid | null = null;
  private graph: NavGraph | null = null;
  private initialized = false;

  async initialize(maskUrl: string, cellSize = 16): Promise<NavGraph> {
    this.grid = await maskToGrid(maskUrl, cellSize, 200);
    this.graph = gridToGraph(this.grid);

    this.addSpawnPointNodes();

    this.initialized = true;
    return this.graph;
  }

  private addSpawnPointNodes(): void {
    if (!this.graph) return;

    for (const spawn of SPAWN_POINTS) {
      const nearestRoad = this.findNearestRoadToEdge(spawn.edge);
      if (nearestRoad) {
        const spawnNode: NavNode = {
          id: spawn.id,
          x: spawn.position.x,
          y: spawn.position.y,
          gridX: -1,
          gridY: spawn.edge === "top" ? -1 : 999,
          neighbors: [nearestRoad.id],
        };
        this.graph.nodes.set(spawn.id, spawnNode);
        nearestRoad.neighbors.push(spawn.id);
      }
    }
  }

  private findNearestRoadToEdge(edge: "top" | "bottom"): NavNode | null {
    if (!this.graph) return null;

    let bestNode: NavNode | null = null;
    let bestDist = Infinity;

    const targetY = edge === "top" ? 0 : 1000;
    const targetX = 415;

    for (const node of this.graph.nodes.values()) {
      if (node.id.startsWith("top-") || node.id.startsWith("bottom-")) continue;

      const dx = node.x - targetX;
      const dy = node.y - targetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }
    }

    return bestNode;
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

  findPathFromSpawn(spawnId: string, to: Point, jitter = 0.1): Point[] | null {
    if (!this.graph) {
      console.warn("[Nav] No graph available");
      return null;
    }

    const spawnNode = this.graph.nodes.get(spawnId);
    if (!spawnNode) {
      console.warn(`[Nav] Spawn point not found: ${spawnId}`);
      return null;
    }

    const endNode = findNearestNode(this.graph, to.x, to.y);
    if (!endNode) {
      console.warn(`[Nav] No end node found near (${to.x.toFixed(0)}, ${to.y.toFixed(0)})`);
      return null;
    }

    const nodePath = aStar(this.graph, spawnNode.id, endNode.id, { jitter });
    if (!nodePath) {
      console.warn(`[Nav] A* found no path from ${spawnNode.id} to ${endNode.id}`);
      return null;
    }

    const waypoints = pathToWaypoints(nodePath, this.graph);
    return smoothPath(waypoints, 0.3);
  }

  findPathToExit(from: Point, exitId: string, jitter = 0.1): Point[] | null {
    if (!this.graph) {
      console.warn("[Nav] No graph available");
      return null;
    }

    const exitNode = this.graph.nodes.get(exitId);
    if (!exitNode) {
      console.warn(`[Nav] Exit point not found: ${exitId}`);
      return null;
    }

    const startNode = findNearestNode(this.graph, from.x, from.y);
    if (!startNode) {
      console.warn(`[Nav] No start node found near (${from.x.toFixed(0)}, ${from.y.toFixed(0)})`);
      return null;
    }

    const nodePath = aStar(this.graph, startNode.id, exitNode.id, { jitter });
    if (!nodePath) {
      console.warn(`[Nav] A* found no path from ${startNode.id} to ${exitNode.id}`);
      return null;
    }

    const waypoints = pathToWaypoints(nodePath, this.graph);
    return smoothPath(waypoints, 0.3);
  }

  getSpawnPoint(id: string): SpawnPoint | undefined {
    return getSpawnPointById(id);
  }
}

export const navigationSystem = new NavigationSystem();

import type { Grid, NavGraph, NavNode } from "../../types";

type Direction = { dx: number; dy: number; name: string };

const DIRS: Direction[] = [
  { dx: 0, dy: -1, name: "n" },
  { dx: 1, dy: 0, name: "e" },
  { dx: 0, dy: 1, name: "s" },
  { dx: -1, dy: 0, name: "w" },
];

export function gridToGraph(grid: Grid): NavGraph {
  const { cols, rows, cellSize, width, height } = grid;

  const isRoad = (x: number, y: number): boolean => {
    return x >= 0 && x < cols && y >= 0 && y < rows && grid.isWalkable(x, y);
  };

  const getNeighborhood = (
    x: number,
    y: number
  ): { n: boolean; e: boolean; s: boolean; w: boolean } => {
    return {
      n: isRoad(x, y - 1),
      e: isRoad(x + 1, y),
      s: isRoad(x, y + 1),
      w: isRoad(x - 1, y),
    };
  };

  const isNodeTile = (x: number, y: number): boolean => {
    if (!isRoad(x, y)) return false;

    const nb = getNeighborhood(x, y);
    const deg = [nb.n, nb.e, nb.s, nb.w].filter(Boolean).length;

    if (deg === 1) return true;
    if (deg >= 3) return true;

    if (deg === 2) {
      const straightNS = nb.n && nb.s;
      const straightEW = nb.e && nb.w;
      if (straightNS || straightEW) return false;
      return true;
    }

    return false;
  };

  const nodes = new Map<string, NavNode>();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (isNodeTile(x, y)) {
        const id = `${x},${y}`;
        nodes.set(id, {
          id,
          x: x * cellSize + cellSize / 2,
          y: y * cellSize + cellSize / 2,
          gridX: x,
          gridY: y,
          neighbors: [],
        });
      }
    }
  }

  for (const node of nodes.values()) {
    for (const dir of DIRS) {
      let x = node.gridX + dir.dx;
      let y = node.gridY + dir.dy;

      if (!isRoad(x, y)) continue;

      while (isRoad(x, y)) {
        const key = `${x},${y}`;
        if (nodes.has(key)) {
          node.neighbors.push(key);
          break;
        }
        x += dir.dx;
        y += dir.dy;
      }
    }
  }

  return {
    nodes,
    cellSize,
    width,
    height,
  };
}

export function findNearestNode(
  graph: NavGraph,
  worldX: number,
  worldY: number
): NavNode | null {
  let bestNode: NavNode | null = null;
  let bestDist = Infinity;

  for (const node of graph.nodes.values()) {
    const dx = node.x - worldX;
    const dy = node.y - worldY;
    const dist = dx * dx + dy * dy;

    if (dist < bestDist) {
      bestDist = dist;
      bestNode = node;
    }
  }

  return bestNode;
}

import type { NavGraph, NavNode } from "../../types";

interface AStarOptions {
  jitter?: number;
}

function heuristic(a: NavNode, b: NavNode): number {
  return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
}

function distance(a: NavNode, b: NavNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function aStar(
  graph: NavGraph,
  startId: string,
  goalId: string,
  options: AStarOptions = {}
): string[] | null {
  const { jitter = 0.08 } = options;
  const { nodes } = graph;

  const startNode = nodes.get(startId);
  const goalNode = nodes.get(goalId);

  if (!startNode || !goalNode) return null;

  const open = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([
    [startId, heuristic(startNode, goalNode)],
  ]);

  const lowestF = (): string | null => {
    let best: string | null = null;
    let bestVal = Infinity;
    for (const id of open) {
      const v = fScore.get(id) ?? Infinity;
      if (v < bestVal) {
        bestVal = v;
        best = id;
      }
    }
    return best;
  };

  while (open.size > 0) {
    const current = lowestF();
    if (!current) break;

    if (current === goalId) {
      const path: string[] = [current];
      let node = current;
      while (cameFrom.has(node)) {
        node = cameFrom.get(node)!;
        path.push(node);
      }
      path.reverse();
      return path;
    }

    open.delete(current);
    const currentNode = nodes.get(current);
    if (!currentNode) continue;

    for (const neighborId of currentNode.neighbors) {
      const neighborNode = nodes.get(neighborId);
      if (!neighborNode) continue;

      const rand = 1 + (Math.random() * 2 - 1) * jitter;
      const edgeCost = distance(currentNode, neighborNode) * rand;
      const tentative = (gScore.get(current) ?? Infinity) + edgeCost;

      if (tentative < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentative);
        fScore.set(
          neighborId,
          tentative + heuristic(neighborNode, goalNode)
        );
        open.add(neighborId);
      }
    }
  }

  return null;
}

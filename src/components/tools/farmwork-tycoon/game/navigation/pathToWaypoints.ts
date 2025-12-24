import type { NavGraph, Point } from "../../types";

export function pathToWaypoints(
  path: string[],
  graph: NavGraph
): Point[] {
  return path
    .map((id) => {
      const node = graph.nodes.get(id);
      if (!node) return null;
      return { x: node.x, y: node.y };
    })
    .filter((p): p is Point => p !== null);
}

export function smoothPath(waypoints: Point[], strength = 0.5): Point[] {
  if (waypoints.length < 3) return waypoints;

  const smoothed: Point[] = [waypoints[0]];

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    smoothed.push({
      x: curr.x + (prev.x + next.x - 2 * curr.x) * strength * 0.5,
      y: curr.y + (prev.y + next.y - 2 * curr.y) * strength * 0.5,
    });
  }

  smoothed.push(waypoints[waypoints.length - 1]);

  return smoothed;
}

import type { Point } from "../../types";

export interface SpawnPoint {
  id: string;
  position: Point;
  direction: "enter" | "exit";
  edge: "top" | "bottom";
}

export const SPAWN_POINTS: SpawnPoint[] = [
  {
    id: "top-entry",
    position: { x: 415, y: -30 },
    direction: "enter",
    edge: "top",
  },
  {
    id: "bottom-entry",
    position: { x: 415, y: 1030 },
    direction: "enter",
    edge: "bottom",
  },
  {
    id: "top-exit",
    position: { x: 415, y: -30 },
    direction: "exit",
    edge: "top",
  },
  {
    id: "bottom-exit",
    position: { x: 415, y: 1030 },
    direction: "exit",
    edge: "bottom",
  },
];

function getSpawnPointsForDirection(
  direction: "enter" | "exit"
): SpawnPoint[] {
  return SPAWN_POINTS.filter((sp) => sp.direction === direction);
}

export function getRandomSpawnPoint(direction: "enter" | "exit"): SpawnPoint {
  const points = getSpawnPointsForDirection(direction);
  return points[Math.floor(Math.random() * points.length)];
}

export function getNearestExitPoint(position: Point): SpawnPoint {
  const exitPoints = getSpawnPointsForDirection("exit");

  let nearest = exitPoints[0];
  let minDist = Infinity;

  for (const point of exitPoints) {
    const dx = point.position.x - position.x;
    const dy = point.position.y - position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
      nearest = point;
    }
  }

  return nearest;
}

export function getSpawnPointById(id: string): SpawnPoint | undefined {
  return SPAWN_POINTS.find((sp) => sp.id === id);
}

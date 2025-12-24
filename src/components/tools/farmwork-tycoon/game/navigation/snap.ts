import type { NavGraph, NavNode, Point } from "../../types";
import { findNearestNode } from "./gridToGraph";

export function snapToRoad(
  graph: NavGraph,
  worldPoint: Point
): NavNode | null {
  return findNearestNode(graph, worldPoint.x, worldPoint.y);
}

export function getNearestNodeId(
  graph: NavGraph,
  worldPoint: Point
): string | null {
  const node = findNearestNode(graph, worldPoint.x, worldPoint.y);
  return node ? node.id : null;
}

export function getRandomRoadNode(graph: NavGraph): NavNode | null {
  const nodeArray = Array.from(graph.nodes.values());
  if (nodeArray.length === 0) return null;
  return nodeArray[Math.floor(Math.random() * nodeArray.length)];
}

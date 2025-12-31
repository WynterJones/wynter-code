import type { NavGraph, NavNode } from "../../types";

export function getRandomRoadNode(graph: NavGraph): NavNode | null {
  const nodeArray = Array.from(graph.nodes.values());
  if (nodeArray.length === 0) return null;
  return nodeArray[Math.floor(Math.random() * nodeArray.length)];
}

import type { BeadsStats } from "@/types/beads";

export interface Point {
  x: number;
  y: number;
}

export interface BuildingPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  dockX: number;
  dockY: number;
}

export type BuildingType =
  | "security"
  | "tests"
  | "performance"
  | "farmhouse"
  | "office"
  | "accessibility"
  | "garden"
  | "compost"
  | "codeQuality";

export type BuildingActivity = "idle" | "working" | "alert";

export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  position: BuildingPosition;
  score: number;
  activity: BuildingActivity;
  color: string;
}

export type VehicleType = "blue-truck" | "white-truck" | "tractor";
export type VehicleDirection = "up" | "down" | "left" | "right";

export interface Vehicle {
  id: string;
  type: VehicleType;
  position: Point;
  destination: string | null;
  returnDestination?: string | null;
  path: Point[];
  pathIndex: number;
  speed: number;
  carrying: boolean;
  direction: VehicleDirection;
}

export type ActivityEventType =
  | "issue_created"
  | "issue_closed"
  | "issue_started"
  | "audit_updated"
  | "vehicle_arrived"
  | "idea_added"
  | "idea_composted";

export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: ActivityEventType;
  message: string;
  buildingId?: string;
}

export interface AuditScores {
  security: number;
  tests: number;
  performance: number;
  accessibility: number;
  codeQuality: number;
  farmhouse: number;
}

export interface GardenStats {
  activeIdeas: number;
  ideas: string[];
}

export interface CompostStats {
  rejectedIdeas: number;
}

export interface NavNode {
  id: string;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  neighbors: string[];
}

export interface NavGraph {
  nodes: Map<string, NavNode>;
  cellSize: number;
  width: number;
  height: number;
}

export interface Grid {
  width: number;
  height: number;
  cols: number;
  rows: number;
  cellSize: number;
  cells: boolean[][];
  isWalkable(x: number, y: number): boolean;
}

export interface FarmworkTycoonState {
  isInitialized: boolean;
  isPaused: boolean;
  showDebug: boolean;
  showMiniPlayer: boolean;

  vehicles: Vehicle[];
  buildings: Building[];

  auditScores: AuditScores;
  beadsStats: BeadsStats | null;
  gardenStats: GardenStats;
  compostStats: CompostStats;

  activityFeed: ActivityEvent[];

  navGraph: NavGraph | null;
  simulatedFlowerCount: number | null;

  initialize: (projectPath: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  toggleDebug: () => void;
  showMiniPlayerFn: () => void;
  hideMiniPlayer: () => void;
  toggleMiniPlayer: () => void;
  dispatchVehicle: (vehicleId: string, destinationBuildingId: string) => void;
  updateBuildingScore: (buildingId: string, score: number) => void;
  addActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  refreshStats: () => Promise<void>;
  setNavGraph: (graph: NavGraph) => void;
  updateVehiclePosition: (vehicleId: string, position: Point) => void;
  spawnVehicle: (destination: string, returnDestination?: string) => string;
  removeVehicle: (vehicleId: string) => void;
  setVehicleCarrying: (vehicleId: string, carrying: boolean) => void;
  startTestRun: () => void;
  clearAllVehicles: () => void;
  setSimulatedFlowerCount: (count: number | null) => void;
}

export const BUILDING_COLORS: Record<BuildingType, string> = {
  security: "#ef4444",
  tests: "#3b82f6",
  performance: "#f59e0b",
  farmhouse: "#8b5cf6",
  office: "#06b6d4",
  accessibility: "#10b981",
  garden: "#84cc16",
  compost: "#78716c",
  codeQuality: "#ec4899",
};

export const BUILDING_POSITIONS: Record<BuildingType, BuildingPosition> = {
  // Top row (x,y is top-left corner)
  security: { x: 85, y: 50, width: 240, height: 185, dockX: 185, dockY: 195 },
  tests: { x: 435, y: 50, width: 240, height: 185, dockX: 415, dockY: 195 },
  performance: {
    x: 700,
    y: 50,
    width: 240,
    height: 185,
    dockX: 790,
    dockY: 195,
  },
  // Middle row
  farmhouse: {
    x: 160,
    y: 335,
    width: 235,
    height: 195,
    dockX: 175,
    dockY: 455,
  },
  office: { x: 492, y: 335, width: 160, height: 195, dockX: 415, dockY: 455 },
  accessibility: {
    x: 745,
    y: 335,
    width: 200,
    height: 195,
    dockX: 760,
    dockY: 455,
  },
  // Bottom row
  garden: { x: 35, y: 700, width: 345, height: 270, dockX: 235, dockY: 530 },
  compost: { x: 430, y: 890, width: 100, height: 100, dockX: 490, dockY: 620 },
  codeQuality: {
    x: 630,
    y: 630,
    width: 320,
    height: 280,
    dockX: 760,
    dockY: 620,
  },
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  security: "Security",
  tests: "Tests",
  performance: "Performance",
  farmhouse: "Farmhouse",
  office: "Home/Office",
  accessibility: "Accessibility",
  garden: "Idea Garden",
  compost: "Compost",
  codeQuality: "Code Quality",
};

export const getVehicleTypeForDestination = (
  destination: string,
): VehicleType => {
  switch (destination) {
    case "garden":
      return "white-truck";
    case "compost":
    case "performance":
      return "tractor";
    default:
      return "blue-truck";
  }
};

export const VEHICLE_SPRITE_PATHS: Record<
  VehicleType,
  {
    up: string;
    upFilled: string;
    left: string;
    leftFilled: string;
  }
> = {
  "blue-truck": {
    up: "/tycoon/blue-truck-up.png",
    upFilled: "/tycoon/blue-truck-up-filled.png",
    left: "/tycoon/blue-truck-left.png",
    leftFilled: "/tycoon/blue-truck-left-filled.png",
  },
  "white-truck": {
    up: "/tycoon/white-truck-up.png",
    upFilled: "/tycoon/white-truck-up-filled.png",
    left: "/tycoon/white-truck-left.png",
    leftFilled: "/tycoon/white-truck-left-filled.png",
  },
  tractor: {
    up: "/tycoon/tractor-up.png",
    upFilled: "/tycoon/tractor-up-filled.png",
    left: "/tycoon/tractor-left.png",
    leftFilled: "/tycoon/tractor-left-filled.png",
  },
};

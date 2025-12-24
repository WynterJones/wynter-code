import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { BeadsStats } from "@/types/beads";
import type {
  FarmworkTycoonState,
  Building,
  Vehicle,
  ActivityEvent,
  AuditScores,
  NavGraph,
  Point,
  BuildingType,
} from "@/components/tools/farmwork-tycoon/types";
import {
  BUILDING_POSITIONS,
  BUILDING_NAMES,
  BUILDING_COLORS,
  getVehicleTypeForDestination,
} from "@/components/tools/farmwork-tycoon/types";

const createInitialBuildings = (): Building[] => {
  const buildingTypes: BuildingType[] = [
    "security",
    "tests",
    "performance",
    "farmhouse",
    "office",
    "accessibility",
    "garden",
    "compost",
    "codeQuality",
  ];

  return buildingTypes.map((type) => ({
    id: type,
    name: BUILDING_NAMES[type],
    type,
    position: BUILDING_POSITIONS[type],
    score: 5,
    activity: "idle",
    color: BUILDING_COLORS[type],
  }));
};

const parseAuditScore = (content: string): number => {
  const match = content.match(/\*\*Score:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (match) return parseFloat(match[1]);

  const altMatch = content.match(/Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  return altMatch ? parseFloat(altMatch[1]) : 5.0;
};

const parseGardenIdeas = (content: string): string[] => {
  const ideas: string[] = [];
  const lines = content.split("\n");
  let inIdeasSection = false;

  for (const line of lines) {
    if (line.match(/^##\s*Ideas/i)) {
      inIdeasSection = true;
      continue;
    }
    if (inIdeasSection && line.startsWith("## ")) {
      break;
    }
    if (inIdeasSection) {
      const ideaMatch = line.match(/^[-*]\s*\*\*(.+?)\*\*/);
      if (ideaMatch) {
        ideas.push(ideaMatch[1]);
      }
    }
  }

  return ideas;
};

const parseCompostCount = (content: string): number => {
  const matches = content.match(/^[-*]\s+/gm);
  return matches ? matches.length : 0;
};

export const useFarmworkTycoonStore = create<FarmworkTycoonState>((set, get) => ({
  isInitialized: false,
  isPaused: false,
  showDebug: false,
  showMiniPlayer: false,

  vehicles: [],
  buildings: createInitialBuildings(),

  auditScores: {
    security: 5,
    tests: 5,
    performance: 5,
    accessibility: 5,
    codeQuality: 5,
    farmhouse: 5,
  },
  beadsStats: null,
  gardenStats: { activeIdeas: 0, ideas: [] },
  compostStats: { rejectedIdeas: 0 },

  activityFeed: [],
  navGraph: null,
  simulatedFlowerCount: null,

  initialize: async (_projectPath: string) => {
    await get().refreshStats();
    set({ isInitialized: true });
  },

  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),

  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),

  showMiniPlayerFn: () => set({ showMiniPlayer: true }),
  hideMiniPlayer: () => set({ showMiniPlayer: false }),
  toggleMiniPlayer: () => set((state) => ({ showMiniPlayer: !state.showMiniPlayer })),

  dispatchVehicle: (vehicleId: string, destinationBuildingId: string) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, destination: destinationBuildingId } : v
      ),
    }));
  },

  updateBuildingScore: (buildingId: string, score: number) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === buildingId ? { ...b, score } : b
      ),
    }));
  },

  addActivity: (event) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    set((state) => ({
      activityFeed: [newEvent, ...state.activityFeed].slice(0, 50),
    }));
  },

  refreshStats: async () => {
    try {
      const projectPath = window.__FARMWORK_PROJECT_PATH__;
      if (!projectPath) return;

      try {
        const stats = await invoke<BeadsStats>("beads_stats", { projectPath });
        set({ beadsStats: stats });
      } catch {
        // Beads not available
      }

      const auditScores: AuditScores = {
        security: 5,
        tests: 5,
        performance: 5,
        accessibility: 5,
        codeQuality: 5,
        farmhouse: 5,
      };

      const auditFiles: [keyof AuditScores, string][] = [
        ["security", "_AUDIT/SECURITY.md"],
        ["tests", "_AUDIT/TESTS.md"],
        ["performance", "_AUDIT/PERFORMANCE.md"],
        ["accessibility", "_AUDIT/ACCESSIBILITY.md"],
        ["codeQuality", "_AUDIT/CODE_QUALITY.md"],
        ["farmhouse", "_AUDIT/FARMHOUSE.md"],
      ];

      for (const [key, file] of auditFiles) {
        try {
          const filePath = await join(projectPath, file);
          const content = await readTextFile(filePath);
          auditScores[key] = parseAuditScore(content);
        } catch {
          // File doesn't exist, use default
        }
      }

      set({ auditScores });

      set((state) => ({
        buildings: state.buildings.map((b) => {
          let score = 5;
          switch (b.type) {
            case "security":
              score = auditScores.security;
              break;
            case "tests":
              score = auditScores.tests;
              break;
            case "performance":
              score = auditScores.performance;
              break;
            case "accessibility":
              score = auditScores.accessibility;
              break;
            case "codeQuality":
              score = auditScores.codeQuality;
              break;
            case "farmhouse":
              score = auditScores.farmhouse;
              break;
          }
          return { ...b, score };
        }),
      }));

      try {
        const gardenPath = await join(projectPath, "_AUDIT/GARDEN.md");
        const gardenContent = await readTextFile(gardenPath);
        const ideas = parseGardenIdeas(gardenContent);
        set({
          gardenStats: {
            activeIdeas: ideas.length,
            ideas,
          },
        });
      } catch {
        // GARDEN.md doesn't exist
      }

      try {
        const compostPath = await join(projectPath, "_AUDIT/COMPOST.md");
        const compostContent = await readTextFile(compostPath);
        const rejectedIdeas = parseCompostCount(compostContent);
        set({ compostStats: { rejectedIdeas } });
      } catch {
        // COMPOST.md doesn't exist
      }
    } catch (error) {
      console.error("Failed to refresh farmwork stats:", error);
    }
  },

  setNavGraph: (graph: NavGraph) => set({ navGraph: graph }),

  updateVehiclePosition: (vehicleId: string, position: Point) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, position } : v
      ),
    }));
  },

  spawnVehicle: (destination: string, returnDestination?: string) => {
    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(destination);

    const farmhouse = get().buildings.find((b) => b.type === "farmhouse");
    const startPos = farmhouse
      ? { x: farmhouse.position.dockX, y: farmhouse.position.dockY }
      : { x: 500, y: 500 };

    console.log(`[Tycoon] Spawning ${type} vehicle at (${startPos.x}, ${startPos.y}) → ${destination}`);

    const newVehicle: Vehicle = {
      id,
      type,
      position: startPos,
      destination,
      returnDestination: returnDestination || null,
      path: [],
      pathIndex: 0,
      speed: 60 + Math.random() * 30,
      carrying: false,
      direction: "up",
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    return id;
  },

  removeVehicle: (vehicleId: string) => {
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== vehicleId),
    }));
  },

  setVehicleCarrying: (vehicleId: string, carrying: boolean) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, carrying } : v
      ),
    }));
  },

  startTestRun: () => {
    const buildings = get().buildings;
    const destinations = buildings
      .filter((b) => b.type !== "farmhouse" && b.type !== "office")
      .map((b) => b.id);

    let delay = 0;
    destinations.forEach((dest) => {
      setTimeout(() => {
        get().spawnVehicle(dest);
        get().addActivity({
          type: "vehicle_arrived",
          message: `Test vehicle dispatched to ${dest}`,
          buildingId: dest,
        });
      }, delay);
      delay += 800 + Math.random() * 400;
    });

    set({ simulatedFlowerCount: 0 });

    const maxFlowers = 20;
    let flowerDelay = 500;
    for (let i = 1; i <= maxFlowers; i++) {
      setTimeout(() => {
        set({ simulatedFlowerCount: i });
        get().addActivity({
          type: "idea_added",
          message: `Idea ${i} planted in garden`,
          buildingId: "garden",
        });
      }, flowerDelay);
      flowerDelay += 300 + Math.random() * 200;
    }

    const holdDuration = flowerDelay + 3000;

    for (let i = maxFlowers - 1; i >= 0; i--) {
      setTimeout(() => {
        set({ simulatedFlowerCount: i });
        if (i > 0) {
          get().addActivity({
            type: "idea_composted",
            message: `Idea composted (${i} remaining)`,
            buildingId: "compost",
          });
        }
      }, holdDuration + (maxFlowers - i) * 250);
    }

    setTimeout(() => {
      set({ simulatedFlowerCount: null });
    }, holdDuration + maxFlowers * 250 + 500);
  },

  clearAllVehicles: () => {
    set({ vehicles: [], simulatedFlowerCount: null });
  },

  setSimulatedFlowerCount: (count: number | null) => {
    set({ simulatedFlowerCount: count });
  },
}));

declare global {
  interface Window {
    __FARMWORK_PROJECT_PATH__?: string;
  }
}

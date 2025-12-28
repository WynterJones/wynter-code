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
  AuditMetadata,
  AuditItem,
  AuditKey,
  NavGraph,
  Point,
  BuildingType,
  MapCycleState,
  TimeOfDay,
  Season,
} from "@/components/tools/farmwork-tycoon/types";
import {
  BUILDING_POSITIONS,
  BUILDING_NAMES,
  BUILDING_COLORS,
  getVehicleTypeForDestination,
  VEHICLE_SPEED,
} from "@/components/tools/farmwork-tycoon/types";
import {
  getRandomSpawnPoint,
  getNearestExitPoint,
} from "@/components/tools/farmwork-tycoon/game/navigation/SpawnPoints";

// Map cycle configuration constants
const DAY_NIGHT_CYCLE_DURATION = 45; // seconds per day/night cycle
const TRANSITION_DURATION = 14; // seconds for smooth transition
const WINTER_INTERVAL = 180; // seconds between winter periods (3 minutes)
const WINTER_DURATION = 60; // seconds to stay in winter

const getMapKey = (timeOfDay: TimeOfDay, season: Season): string => {
  return `${timeOfDay}-${season}`;
};

const createInitialMapCycleState = (): MapCycleState => ({
  timeOfDay: "day",
  season: "summer",
  dayNightTimer: 0,
  winterTimer: 0,
  isWinter: false,
  transitionProgress: 0,
  isTransitioning: false,
  transitionFrom: "day-summer",
  transitionTo: "day-summer",
  lastTickTime: 0,
});

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

  return buildingTypes.map((type) => {
    // Count-based buildings (garden, compost, office) start at 0
    // Audit buildings start at 5 (middle score)
    const initialScore = ["garden", "compost", "office"].includes(type) ? 0 : 5;
    return {
      id: type,
      name: BUILDING_NAMES[type],
      type,
      position: BUILDING_POSITIONS[type],
      score: initialScore,
      activity: "idle",
      color: BUILDING_COLORS[type],
    };
  });
};

const createDefaultAuditMetadata = (): AuditMetadata => ({
  score: 0,
  lastUpdated: null,
  status: null,
  openItems: [],
});

const parseAuditFile = (content: string): AuditMetadata => {
  const result = createDefaultAuditMetadata();

  // Parse score: **Score:** 8.7/10
  const scoreMatch = content.match(/\*\*Score:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (scoreMatch) {
    result.score = parseFloat(scoreMatch[1]);
  }

  // Parse last updated: **Last Updated:** 2025-12-22
  const lastUpdatedMatch = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/i);
  if (lastUpdatedMatch) {
    result.lastUpdated = lastUpdatedMatch[1];
  }

  // Parse status: **Status:** 1 open item OR **Status:** Initial setup
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i);
  if (statusMatch) {
    result.status = statusMatch[1].trim();
  }

  // Parse open items from ## Open Items section
  const openItemsSection = content.match(/## Open Items\s*\n([\s\S]*?)(?=\n---|\n## |$)/i);
  if (openItemsSection) {
    const sectionContent = openItemsSection[1];
    // Skip if it says "None currently" or similar
    if (!sectionContent.match(/_None|No open items|Empty/i)) {
      const lines = sectionContent.split("\n");
      for (const line of lines) {
        // Match bullet points: - Item text or * Item text
        const itemMatch = line.match(/^[-*]\s+(.+)/);
        if (itemMatch) {
          const text = itemMatch[1].trim();
          // Check for priority markers
          let priority: AuditItem["priority"] = undefined;
          if (text.match(/\[HIGH\]|\(HIGH\)|🔴/i)) priority = "high";
          else if (text.match(/\[MEDIUM\]|\(MEDIUM\)|🟡/i)) priority = "medium";
          else if (text.match(/\[LOW\]|\(LOW\)|🟢/i)) priority = "low";

          result.openItems.push({
            text: text.replace(/\[(HIGH|MEDIUM|LOW)\]|\((HIGH|MEDIUM|LOW)\)|[🔴🟡🟢]/gi, "").trim(),
            priority
          });
        }
      }
    }
  }

  return result;
};

interface GardenParseResult {
  planted: number;        // Ideas in Ideas section
  growing: number;        // Graduated to plans
  picked: number;         // Implemented
  ideas: string[];
}

const parseGardenIdeas = (content: string): GardenParseResult => {
  const ideas: string[] = [];
  const lines = content.split("\n");
  let inIdeasSection = false;
  let inGraduatedSection = false;
  let inImplementedSection = false;

  let planted = 0;
  let growing = 0;
  let picked = 0;

  // First try to parse the header count: **Active Ideas:** N
  const headerMatch = content.match(/\*\*Active Ideas:\*\*\s*(\d+)/i);
  const headerCount = headerMatch ? parseInt(headerMatch[1], 10) : null;

  // Parse sections
  for (const line of lines) {
    // Detect section headers
    if (line.match(/^##\s*Ideas\s*$/i)) {
      inIdeasSection = true;
      inGraduatedSection = false;
      inImplementedSection = false;
      continue;
    }
    if (line.match(/^##\s*Graduated to Plans/i)) {
      inIdeasSection = false;
      inGraduatedSection = true;
      inImplementedSection = false;
      continue;
    }
    if (line.match(/^##\s*Implemented/i)) {
      inIdeasSection = false;
      inGraduatedSection = false;
      inImplementedSection = true;
      continue;
    }
    if (line.startsWith("## ") || line.startsWith("---")) {
      if (line.startsWith("---")) continue;
      inIdeasSection = false;
      inGraduatedSection = false;
      inImplementedSection = false;
      continue;
    }

    // Count items in Ideas section (H3 headers like "### Auto Build")
    if (inIdeasSection) {
      const ideaMatch = line.match(/^###\s+(.+)/);
      if (ideaMatch) {
        ideas.push(ideaMatch[1]);
        planted++;
      }
    }

    // Count rows in Graduated table (lines starting with |, excluding header/separator)
    if (inGraduatedSection) {
      if (line.match(/^\|\s*[^|\-\s]/) && !line.match(/^\|\s*Idea\s*\|/i)) {
        growing++;
      }
    }

    // Count rows in Implemented table
    if (inImplementedSection) {
      if (line.match(/^\|\s*[^|\-\s]/) && !line.match(/^\|\s*Idea\s*\|/i)) {
        picked++;
      }
    }
  }

  // Use header count if available for planted, otherwise use counted ideas
  if (headerCount !== null) {
    planted = headerCount;
  }

  return { planted, growing, picked, ideas };
};

const parseCompostStats = (content: string): { count: number; ideas: string[] } => {
  const ideas: string[] = [];

  // Extract idea names from ### headers
  const entryMatches = content.match(/^###\s+(.+)$/gm);
  if (entryMatches) {
    for (const match of entryMatches) {
      const ideaName = match.replace(/^###\s+/, "").trim();
      if (ideaName) {
        ideas.push(ideaName);
      }
    }
  }

  // First try to parse the header count: **Composted Ideas:** N
  const headerMatch = content.match(/\*\*Composted Ideas:\*\*\s*(\d+)/i);
  const count = headerMatch ? parseInt(headerMatch[1], 10) : ideas.length;

  return { count, ideas };
};

export const useFarmworkTycoonStore = create<FarmworkTycoonState>((set, get) => ({
  isInitialized: false,
  isPaused: false,
  showDebug: false,
  hideTooltips: false,
  showMiniPlayer: false,

  vehicles: [],
  buildings: createInitialBuildings(),

  auditScores: {
    security: createDefaultAuditMetadata(),
    tests: createDefaultAuditMetadata(),
    performance: createDefaultAuditMetadata(),
    accessibility: createDefaultAuditMetadata(),
    codeQuality: createDefaultAuditMetadata(),
    farmhouse: createDefaultAuditMetadata(),
  },
  beadsStats: null,
  gardenStats: { activeIdeas: 0, ideas: [], planted: 0, growing: 0, picked: 0 },
  compostStats: { rejectedIdeas: 0, ideas: [] },

  activityFeed: [],
  navGraph: null,
  simulatedFlowerCount: null,
  celebrationQueue: [],
  mapCycle: createInitialMapCycleState(),

  initialize: async (_projectPath: string) => {
    await get().refreshStats();
    set({ isInitialized: true });
  },

  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),

  toggleDebug: () => set((state) => ({ showDebug: !state.showDebug })),
  toggleHideTooltips: () => set((state) => ({ hideTooltips: !state.hideTooltips })),

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
      if (!projectPath) {
        return;
      }

      try {
        const stats = await invoke<BeadsStats>("beads_stats", { projectPath });
        set({ beadsStats: stats });
      } catch {
        // Beads not available
      }

      const auditScores: AuditScores = {
        security: createDefaultAuditMetadata(),
        tests: createDefaultAuditMetadata(),
        performance: createDefaultAuditMetadata(),
        accessibility: createDefaultAuditMetadata(),
        codeQuality: createDefaultAuditMetadata(),
        farmhouse: createDefaultAuditMetadata(),
      };

      const auditFiles: [AuditKey, string][] = [
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
          const parsed = parseAuditFile(content);
          auditScores[key] = parsed;
        } catch {
          // File doesn't exist, use default (0)
        }
      }

      set({ auditScores });

      // Parse garden stats
      let gardenCount = 0;
      let gardenIdeas: string[] = [];
      let planted = 0;
      let growing = 0;
      let picked = 0;
      try {
        const gardenPath = await join(projectPath, "_AUDIT/GARDEN.md");
        const gardenContent = await readTextFile(gardenPath);
        const result = parseGardenIdeas(gardenContent);
        gardenCount = result.planted;
        gardenIdeas = result.ideas;
        planted = result.planted;
        growing = result.growing;
        picked = result.picked;
        set({
          gardenStats: {
            activeIdeas: gardenCount,
            ideas: gardenIdeas,
            planted,
            growing,
            picked,
          },
        });
      } catch {
        // GARDEN.md doesn't exist
      }

      // Parse compost stats
      let compostCount = 0;
      let compostIdeas: string[] = [];
      try {
        const compostPath = await join(projectPath, "_AUDIT/COMPOST.md");
        const compostContent = await readTextFile(compostPath);
        const compostResult = parseCompostStats(compostContent);
        compostCount = compostResult.count;
        compostIdeas = compostResult.ideas;
        set({ compostStats: { rejectedIdeas: compostCount, ideas: compostIdeas } });
      } catch {
        // COMPOST.md doesn't exist
      }

      // Update all buildings with their respective scores/counts
      // and detect 10/10 celebrations
      const currentBuildings = get().buildings;
      const newCelebrations: string[] = [];

      set((state) => ({
        buildings: state.buildings.map((b) => {
          let newScore = 0;
          switch (b.type) {
            case "security":
              newScore = auditScores.security.score;
              break;
            case "tests":
              newScore = auditScores.tests.score;
              break;
            case "performance":
              newScore = auditScores.performance.score;
              break;
            case "accessibility":
              newScore = auditScores.accessibility.score;
              break;
            case "codeQuality":
              newScore = auditScores.codeQuality.score;
              break;
            case "farmhouse":
              newScore = auditScores.farmhouse.score;
              break;
            case "garden":
              newScore = gardenCount;
              break;
            case "compost":
              newScore = compostCount;
              break;
            case "office":
              // Office (Home) tracks tool count - preserve existing value
              newScore = b.score;
              break;
          }

          // Detect when a building hits 10/10 (only for audit buildings)
          const oldBuilding = currentBuildings.find((ob) => ob.id === b.id);
          const oldScore = oldBuilding?.score ?? 0;
          if (
            newScore >= 10 &&
            oldScore < 10 &&
            ["security", "tests", "performance", "accessibility", "codeQuality", "farmhouse"].includes(b.type)
          ) {
            newCelebrations.push(b.id);
          }

          return { ...b, score: newScore };
        }),
      }));

      // Add celebrations to queue and activity feed
      if (newCelebrations.length > 0) {
        const buildings = get().buildings;
        for (const buildingId of newCelebrations) {
          const building = buildings.find((b) => b.id === buildingId);
          if (building) {
            get().addActivity({
              type: "celebration",
              message: `${building.name} achieved perfect score!`,
              buildingId,
            });
          }
        }
        set((state) => ({
          celebrationQueue: [...state.celebrationQueue, ...newCelebrations],
        }));
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

  spawnVehicle: (destination: string) => {
    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(destination);

    const spawnPoint = getRandomSpawnPoint("enter");

    // Get farmhouse position for exit point calculation
    const farmhouseBuilding = get().buildings.find((b) => b.id === "farmhouse");
    const farmhousePos = farmhouseBuilding
      ? { x: farmhouseBuilding.position.dockX, y: farmhouseBuilding.position.dockY }
      : { x: 500, y: 500 };
    const exitPoint = getNearestExitPoint(farmhousePos);

    // Route: pickup building → farmhouse (then exit)
    const route = destination === "farmhouse"
      ? [destination]
      : [destination, "farmhouse"];

    const newVehicle: Vehicle = {
      id,
      type,
      position: { ...spawnPoint.position },
      destination,
      returnDestination: "farmhouse",
      route,
      currentRouteIndex: 0,
      task: "entering",
      spawnPoint: spawnPoint.id,
      exitPoint: exitPoint.id,
      path: [],
      pathIndex: 0,
      speed: VEHICLE_SPEED.BASE + Math.random() * VEHICLE_SPEED.VARIANCE,
      carrying: false,
      direction: spawnPoint.edge === "top" ? "down" : "up",
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    return id;
  },

  spawnVehicleWithTint: (destination: string, tint: number) => {
    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(destination);

    const spawnPoint = getRandomSpawnPoint("enter");

    // Get farmhouse position for exit point calculation
    const farmhouseBuilding = get().buildings.find((b) => b.id === "farmhouse");
    const farmhousePos = farmhouseBuilding
      ? { x: farmhouseBuilding.position.dockX, y: farmhouseBuilding.position.dockY }
      : { x: 500, y: 500 };
    const exitPoint = getNearestExitPoint(farmhousePos);

    // Route: pickup building → farmhouse (then exit)
    const route = destination === "farmhouse"
      ? [destination]
      : [destination, "farmhouse"];

    const newVehicle: Vehicle = {
      id,
      type,
      position: { ...spawnPoint.position },
      destination,
      returnDestination: "farmhouse",
      route,
      currentRouteIndex: 0,
      task: "entering",
      spawnPoint: spawnPoint.id,
      exitPoint: exitPoint.id,
      path: [],
      pathIndex: 0,
      speed: VEHICLE_SPEED.BASE + Math.random() * VEHICLE_SPEED.VARIANCE,
      carrying: false,
      direction: spawnPoint.edge === "top" ? "down" : "up",
      tint,
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    return id;
  },

  spawnVehicleWithRoute: (route: string[]) => {
    if (route.length === 0) return "";

    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(route[0]);

    const spawnPoint = getRandomSpawnPoint("enter");
    const lastDestBuilding = get().buildings.find((b) => b.id === route[route.length - 1]);
    const lastDestPos = lastDestBuilding
      ? { x: lastDestBuilding.position.dockX, y: lastDestBuilding.position.dockY }
      : { x: 500, y: 500 };
    const exitPoint = getNearestExitPoint(lastDestPos);

    const newVehicle: Vehicle = {
      id,
      type,
      position: { ...spawnPoint.position },
      destination: route[0],
      returnDestination: route.length > 1 ? route[route.length - 1] : null,
      route,
      currentRouteIndex: 0,
      task: "entering",
      spawnPoint: spawnPoint.id,
      exitPoint: exitPoint.id,
      path: [],
      pathIndex: 0,
      speed: VEHICLE_SPEED.BASE + Math.random() * VEHICLE_SPEED.VARIANCE,
      carrying: false,
      direction: spawnPoint.edge === "top" ? "down" : "up",
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    return id;
  },

  spawnVehicleWithTintAndRoute: (route: string[], tint: number) => {
    if (route.length === 0) return "";

    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(route[0]);

    const spawnPoint = getRandomSpawnPoint("enter");
    const lastDestBuilding = get().buildings.find((b) => b.id === route[route.length - 1]);
    const lastDestPos = lastDestBuilding
      ? { x: lastDestBuilding.position.dockX, y: lastDestBuilding.position.dockY }
      : { x: 500, y: 500 };
    const exitPoint = getNearestExitPoint(lastDestPos);

    const newVehicle: Vehicle = {
      id,
      type,
      position: { ...spawnPoint.position },
      destination: route[0],
      returnDestination: route.length > 1 ? route[route.length - 1] : null,
      route,
      currentRouteIndex: 0,
      task: "entering",
      spawnPoint: spawnPoint.id,
      exitPoint: exitPoint.id,
      path: [],
      pathIndex: 0,
      speed: VEHICLE_SPEED.BASE + Math.random() * VEHICLE_SPEED.VARIANCE,
      carrying: false,
      direction: spawnPoint.edge === "top" ? "down" : "up",
      tint,
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    return id;
  },

  incrementToolCount: () => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === "office" ? { ...b, score: b.score + 1 } : b
      ),
    }));
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
    // All buildings except farmhouse and office can be pickup destinations
    const destinations = buildings
      .filter((b) => b.type !== "farmhouse" && b.type !== "office")
      .map((b) => b.id);

    let delay = 0;

    // Spawn vehicles for each building - they will: enter → pickup → farmhouse → exit
    destinations.forEach((dest) => {
      setTimeout(() => {
        get().spawnVehicle(dest);
        get().addActivity({
          type: "vehicle_arrived",
          message: `Vehicle dispatched: ${BUILDING_NAMES[dest as BuildingType]} → Farmhouse`,
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

  clearCelebrationQueue: () => {
    set({ celebrationQueue: [] });
  },

  tickMapCycle: (dt: number) => {
    const { mapCycle } = get();

    // Prevent double-ticking when multiple TycoonGame instances are mounted
    // Only allow ticks that are at least 10ms apart
    const now = performance.now();
    if (now - mapCycle.lastTickTime < 10) {
      return;
    }

    // Handle active transition
    if (mapCycle.isTransitioning) {
      const newProgress = mapCycle.transitionProgress + dt / TRANSITION_DURATION;

      if (newProgress >= 1) {
        // Transition complete
        set({
          mapCycle: {
            ...mapCycle,
            transitionProgress: 1,
            isTransitioning: false,
            lastTickTime: now,
          },
        });
      } else {
        set({
          mapCycle: {
            ...mapCycle,
            transitionProgress: newProgress,
            lastTickTime: now,
          },
        });
      }
      return;
    }

    // Update timers
    const newDayNightTimer = mapCycle.dayNightTimer + dt;
    const newWinterTimer = mapCycle.winterTimer + dt;

    let updates: Partial<MapCycleState> = {
      dayNightTimer: newDayNightTimer,
      winterTimer: newWinterTimer,
      lastTickTime: now,
    };

    // Check for winter toggle
    if (!mapCycle.isWinter && newWinterTimer >= WINTER_INTERVAL) {
      // Enter winter
      const newKey = getMapKey(mapCycle.timeOfDay, "winter");
      updates = {
        ...updates,
        season: "winter",
        isWinter: true,
        winterTimer: 0,
        transitionProgress: 0,
        isTransitioning: true,
        transitionFrom: getMapKey(mapCycle.timeOfDay, mapCycle.season),
        transitionTo: newKey,
      };
    } else if (mapCycle.isWinter && newWinterTimer >= WINTER_DURATION) {
      // Exit winter
      const newKey = getMapKey(mapCycle.timeOfDay, "summer");
      updates = {
        ...updates,
        season: "summer",
        isWinter: false,
        winterTimer: 0,
        transitionProgress: 0,
        isTransitioning: true,
        transitionFrom: getMapKey(mapCycle.timeOfDay, mapCycle.season),
        transitionTo: newKey,
      };
    }

    // Check for day/night cycle
    if (newDayNightTimer >= DAY_NIGHT_CYCLE_DURATION) {
      const newTimeOfDay: TimeOfDay = mapCycle.timeOfDay === "day" ? "night" : "day";
      const currentSeason = updates.season ?? mapCycle.season;
      const newKey = getMapKey(newTimeOfDay, currentSeason);
      updates = {
        ...updates,
        timeOfDay: newTimeOfDay,
        dayNightTimer: 0,
        transitionProgress: 0,
        isTransitioning: true,
        transitionFrom: getMapKey(mapCycle.timeOfDay, currentSeason),
        transitionTo: newKey,
      };
    }

    set({ mapCycle: { ...mapCycle, ...updates } });
  },
}));

declare global {
  interface Window {
    __FARMWORK_PROJECT_PATH__?: string;
  }
}

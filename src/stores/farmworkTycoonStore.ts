import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { BeadsStats, BeadsIssue, BeadsStatus } from "@/types/beads";
import { PRIORITY_HEX_COLORS } from "@/types/beads";
import type {
  FarmworkTycoonState,
  Building,
  Vehicle,
  ActivityEvent,
  AuditScores,
  AuditKey,
  NavGraph,
  Point,
  BuildingType,
  MapCycleState,
  TimeOfDay,
  Season,
  BeadVehicleMapping,
  SpawnVehicleOptions,
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
import {
  createDefaultAuditMetadata,
  parseAuditFile,
  parseGardenIdeas,
  parseCompostStats,
} from "@/lib/farmwork-parsers";

// Map cycle configuration constants
const DAY_NIGHT_CYCLE_DURATION = 45; // seconds per day/night cycle
const TRANSITION_DURATION = 14; // seconds for smooth transition
const WINTER_INTERVAL = 180; // seconds between winter periods (3 minutes)
const WINTER_DURATION = 60; // seconds to stay in winter

// Animation timing constants
const MAP_CENTER = { x: 500, y: 500 };
const VEHICLE_DISPATCH_DELAY_BASE = 800;
const VEHICLE_DISPATCH_DELAY_VARIANCE = 400;
const FLOWER_INITIAL_DELAY = 500;
const FLOWER_DELAY_INCREMENT_BASE = 300;
const FLOWER_DELAY_INCREMENT_VARIANCE = 200;
const FLOWER_HOLD_DURATION = 3000;
const FLOWER_REMOVAL_INTERVAL = 250;
const CLEANUP_DELAY = 500;

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
  pendingBuildingSelection: null,

  // Beads issue vehicle tracking
  beadsEnabled: false,
  beadVehicleMap: new Map<string, BeadVehicleMapping>(),
  completedBeadIssueIds: new Set<string>(),

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

  spawnVehicle: (options: SpawnVehicleOptions) => {
    // Build route from options
    let route: string[];
    if (options.route && options.route.length > 0) {
      route = options.route;
    } else if (options.destination) {
      route = options.destination === "farmhouse"
        ? [options.destination]
        : [options.destination, "farmhouse"];
    } else {
      return "";
    }

    const id = `vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(route[0]);
    const spawnPoint = getRandomSpawnPoint("enter");

    // Calculate exit point based on last destination
    const lastDestBuilding = get().buildings.find((b) => b.id === route[route.length - 1]);
    const lastDestPos = lastDestBuilding
      ? { x: lastDestBuilding.position.dockX, y: lastDestBuilding.position.dockY }
      : MAP_CENTER;
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
      ...(options.tint !== undefined && { tint: options.tint }),
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
        get().spawnVehicle({ destination: dest });
        get().addActivity({
          type: "vehicle_arrived",
          message: `Vehicle dispatched: ${BUILDING_NAMES[dest as BuildingType]} → Farmhouse`,
          buildingId: dest,
        });
      }, delay);
      delay += VEHICLE_DISPATCH_DELAY_BASE + Math.random() * VEHICLE_DISPATCH_DELAY_VARIANCE;
    });

    set({ simulatedFlowerCount: 0 });

    const maxFlowers = 20;
    let flowerDelay = FLOWER_INITIAL_DELAY;
    for (let i = 1; i <= maxFlowers; i++) {
      setTimeout(() => {
        set({ simulatedFlowerCount: i });
        get().addActivity({
          type: "idea_added",
          message: `Idea ${i} planted in garden`,
          buildingId: "garden",
        });
      }, flowerDelay);
      flowerDelay += FLOWER_DELAY_INCREMENT_BASE + Math.random() * FLOWER_DELAY_INCREMENT_VARIANCE;
    }

    const holdDuration = flowerDelay + FLOWER_HOLD_DURATION;

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
      }, holdDuration + (maxFlowers - i) * FLOWER_REMOVAL_INTERVAL);
    }

    setTimeout(() => {
      set({ simulatedFlowerCount: null });
    }, holdDuration + maxFlowers * FLOWER_REMOVAL_INTERVAL + CLEANUP_DELAY);
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

  signalVehicleExit: (vehicleId: string) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? { ...v, shouldExit: true } : v
      ),
    }));
  },

  setPendingBuildingSelection: (buildingId: string | null) => {
    set({ pendingBuildingSelection: buildingId });
  },

  // Beads issue vehicle tracking methods
  setBeadsEnabled: (enabled: boolean) => {
    set({ beadsEnabled: enabled });
  },

  syncBeadVehicles: (issues: BeadsIssue[]) => {
    const { beadVehicleMap, spawnBeadVehicle, signalVehicleExit, completedBeadIssueIds } = get();
    const MAX_BEAD_VEHICLES = 15;

    // Filter to only open/in_progress issues that haven't completed their animation
    const activeIssues = issues
      .filter((i) =>
        (i.status === "open" || i.status === "in_progress") &&
        !completedBeadIssueIds.has(i.id)
      )
      .sort((a, b) => a.priority - b.priority)
      .slice(0, MAX_BEAD_VEHICLES);

    const activeIssueIds = new Set(activeIssues.map((i) => i.id));

    // Remove vehicles for closed/blocked issues
    for (const [issueId, mapping] of beadVehicleMap) {
      if (!activeIssueIds.has(issueId)) {
        // Issue was closed - signal vehicle to exit
        signalVehicleExit(mapping.vehicleId);
        set((state) => {
          const newMap = new Map(state.beadVehicleMap);
          newMap.delete(issueId);
          return { beadVehicleMap: newMap };
        });
      }
    }

    // Add or update vehicles for active issues
    for (const issue of activeIssues) {
      const existing = beadVehicleMap.get(issue.id);

      if (!existing) {
        // New issue - spawn vehicle
        spawnBeadVehicle(issue);
      } else if (existing.status !== issue.status) {
        // Status changed - update vehicle destination
        get().updateBeadVehicleStatus(issue.id, issue.status);
      }
    }
  },

  spawnBeadVehicle: (issue: BeadsIssue) => {
    const destination = issue.status === "open" ? "office" : "farmhouse";
    const tint = PRIORITY_HEX_COLORS[issue.priority] ?? 0xa3a3a3;

    const id = `bead-vehicle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const type = getVehicleTypeForDestination(destination);

    const spawnPoint = getRandomSpawnPoint("enter");
    const exitPoint = getNearestExitPoint(MAP_CENTER);

    // For bead vehicles, route is just to the waiting building
    const route = [destination];

    const newVehicle: Vehicle = {
      id,
      type,
      position: { ...spawnPoint.position },
      destination,
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
      issueId: issue.id,
      issueTitle: issue.title,
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
    }));

    // Store mapping
    set((state) => {
      const newMap = new Map(state.beadVehicleMap);
      newMap.set(issue.id, {
        issueId: issue.id,
        vehicleId: id,
        status: issue.status,
        priority: issue.priority,
        title: issue.title,
      });
      return { beadVehicleMap: newMap };
    });

    get().addActivity({
      type: "issue_created",
      message: `Issue: ${issue.title.slice(0, 30)}${issue.title.length > 30 ? "..." : ""}`,
      buildingId: destination,
    });

    return id;
  },

  updateBeadVehicleStatus: (issueId: string, newStatus: BeadsStatus) => {
    const { beadVehicleMap, vehicles, signalVehicleExit } = get();
    const mapping = beadVehicleMap.get(issueId);
    if (!mapping) return;

    const vehicle = vehicles.find((v) => v.id === mapping.vehicleId);
    if (!vehicle) return;

    if (newStatus === "in_progress" && mapping.status === "open") {
      // Issue started - move vehicle from office to farmhouse
      set((state) => ({
        vehicles: state.vehicles.map((v) =>
          v.id === mapping.vehicleId
            ? {
                ...v,
                route: ["farmhouse"],
                currentRouteIndex: 0,
                destination: "farmhouse",
                task: "traveling_to_farmhouse" as const,
                path: [], // Will be recalculated by game loop
                pathIndex: 0,
              }
            : v
        ),
        beadVehicleMap: new Map(state.beadVehicleMap).set(issueId, {
          ...mapping,
          status: newStatus,
        }),
      }));

      get().addActivity({
        type: "issue_started",
        message: `Started: ${mapping.title.slice(0, 30)}${mapping.title.length > 30 ? "..." : ""}`,
        buildingId: "farmhouse",
      });
    } else if (newStatus === "closed") {
      // Issue closed - signal vehicle to exit
      signalVehicleExit(mapping.vehicleId);

      // Remove from mapping
      set((state) => {
        const newMap = new Map(state.beadVehicleMap);
        newMap.delete(issueId);
        return { beadVehicleMap: newMap };
      });

      get().addActivity({
        type: "issue_closed",
        message: `Closed: ${mapping.title.slice(0, 30)}${mapping.title.length > 30 ? "..." : ""}`,
        buildingId: "farmhouse",
      });
    }
  },

  removeBeadVehicle: (issueId: string) => {
    const { beadVehicleMap, signalVehicleExit } = get();
    const mapping = beadVehicleMap.get(issueId);
    if (!mapping) return;

    signalVehicleExit(mapping.vehicleId);

    set((state) => {
      const newMap = new Map(state.beadVehicleMap);
      newMap.delete(issueId);
      return { beadVehicleMap: newMap };
    });
  },

  markBeadIssueCompleted: (issueId: string) => {
    set((state) => ({
      completedBeadIssueIds: new Set(state.completedBeadIssueIds).add(issueId),
    }));
  },

  clearCompletedBeadIssues: () => {
    set({ completedBeadIssueIds: new Set() });
  },
}));

declare global {
  interface Window {
    __FARMWORK_PROJECT_PATH__?: string;
  }
}

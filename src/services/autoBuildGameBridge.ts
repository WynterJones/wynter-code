/**
 * AutoBuildGameBridge - Connects Auto Build events to Farmwork Tycoon game
 *
 * This service bridges the gap between Auto Build phase transitions and the visual
 * representation in Farmwork Tycoon. When workers change phases, vehicles spawn
 * and animate through the game world with worker-unique colors.
 */

import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import type { BuildingType } from "@/components/tools/farmwork-tycoon/types";
import type {
  AutoBuildWorker,
  AutoBuildPhase,
  AutoBuildSettings,
} from "@/types/autoBuild";

// Worker tint colors - each concurrent worker gets a unique color
const WORKER_TINT_COLORS: number[] = [
  0x3b82f6, // Worker 0: Blue
  0x22c55e, // Worker 1: Green
  0xf97316, // Worker 2: Orange
  0xa855f7, // Worker 3: Purple
  0xec4899, // Worker 4: Pink
  0x06b6d4, // Worker 5: Cyan
  0xeab308, // Worker 6: Yellow
  0xef4444, // Worker 7: Red
];

function getWorkerTint(workerId: number): number {
  return WORKER_TINT_COLORS[workerId % WORKER_TINT_COLORS.length];
}

// Phase to building mapping
const PHASE_TO_BUILDING: Record<
  NonNullable<AutoBuildPhase>,
  BuildingType | null
> = {
  selecting: null, // No vehicle for selecting
  working: "office",
  selfReviewing: "office",
  auditing: null, // Dynamic - determined by enabled audits
  testing: "tests",
  fixing: "office",
  reviewing: "farmhouse",
  committing: "farmhouse",
};

// Phase labels for activity messages
const PHASE_ACTIVITY_LABELS: Record<NonNullable<AutoBuildPhase>, string> = {
  selecting: "selecting issue",
  working: "implementing",
  selfReviewing: "self-reviewing",
  auditing: "running audits",
  testing: "running tests",
  fixing: "fixing issues",
  reviewing: "awaiting review",
  committing: "committing",
};

/**
 * Get the buildings to visit during auditing phase based on enabled settings
 */
function getAuditBuildings(settings: AutoBuildSettings): BuildingType[] {
  const buildings: BuildingType[] = [];

  if (settings.runSecurityAudit) buildings.push("security");
  if (settings.runPerformanceAudit) buildings.push("performance");
  if (settings.runCodeQualityAudit) buildings.push("codeQuality");
  if (settings.runAccessibilityAudit) buildings.push("accessibility");

  // Default to codeQuality if no audits enabled
  return buildings.length > 0 ? buildings : ["codeQuality"];
}

class AutoBuildGameBridge {
  private enabled = true;
  private unsubscribe: (() => void) | null = null;
  private workerPhaseCache = new Map<number, AutoBuildPhase>();

  /**
   * Start listening to Auto Build store changes
   */
  start(): void {
    if (this.unsubscribe) return; // Already started

    this.unsubscribe = useAutoBuildStore.subscribe((state, prevState) => {
      if (!this.enabled) return;

      // Only process when running
      if (state.status !== "running") return;

      // Detect phase changes for each worker
      for (const worker of state.workers) {
        const prevWorker = prevState.workers.find((w) => w.id === worker.id);
        const prevPhase =
          prevWorker?.phase ?? this.workerPhaseCache.get(worker.id);

        if (worker.phase !== prevPhase && worker.phase !== null) {
          this.onWorkerPhaseChange(worker, prevPhase ?? null, state.settings);
        }

        // Update cache
        if (worker.phase) {
          this.workerPhaseCache.set(worker.id, worker.phase);
        } else {
          this.workerPhaseCache.delete(worker.id);
        }
      }

      // Detect issue completion (moved from queue to completed)
      const newlyCompleted = state.completed.filter(
        (id) => !prevState.completed.includes(id)
      );
      for (const issueId of newlyCompleted) {
        this.onIssueCompleted(issueId);
      }
    });

    // Clear cache on start
    this.workerPhaseCache.clear();
  }

  /**
   * Stop listening to store changes
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.workerPhaseCache.clear();
  }

  /**
   * Enable or disable the bridge
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if the bridge is currently running
   */
  isRunning(): boolean {
    return this.unsubscribe !== null;
  }

  /**
   * Handle phase transition for a worker
   */
  private onWorkerPhaseChange(
    worker: AutoBuildWorker,
    _prevPhase: AutoBuildPhase,
    settings: AutoBuildSettings
  ): void {
    const store = useFarmworkTycoonStore.getState();
    if (!store.isInitialized) return;

    const tint = getWorkerTint(worker.id);
    const phase = worker.phase;
    if (!phase) return;

    // Get destinations based on phase
    let destinations: BuildingType[];

    if (phase === "auditing") {
      // Multi-stop route through enabled audit buildings
      destinations = getAuditBuildings(settings);
    } else {
      const building = PHASE_TO_BUILDING[phase];
      if (!building) return; // Skip phases with no building
      destinations = [building];
    }

    // Spawn vehicle with route (ends at farmhouse for most phases)
    const route =
      phase === "committing" || phase === "reviewing"
        ? destinations
        : [...destinations, "farmhouse"];

    store.spawnVehicleWithTintAndRoute(route, tint);

    // Add activity event
    const workerLabel = `W${worker.id + 1}`;
    store.addActivity({
      type: "autobuild_phase_change",
      message: `${workerLabel}: ${PHASE_ACTIVITY_LABELS[phase]}`,
      buildingId: destinations[0],
    });
  }

  /**
   * Handle issue completion - trigger celebration
   */
  private onIssueCompleted(issueId: string): void {
    const store = useFarmworkTycoonStore.getState();
    if (!store.isInitialized) return;

    const autoBuildStore = useAutoBuildStore.getState();
    const issue = autoBuildStore.getCachedIssue(issueId);

    // Spawn gold vehicle to farmhouse for celebration
    store.spawnVehicleWithTintAndRoute(["farmhouse"], 0xffd700);

    store.addActivity({
      type: "autobuild_issue_completed",
      message: `Completed: ${issue?.title || issueId}`,
      buildingId: "farmhouse",
    });
  }

  /**
   * Clean up when the bridge is destroyed
   */
  destroy(): void {
    this.stop();
  }
}

// Singleton instance
export const autoBuildGameBridge = new AutoBuildGameBridge();

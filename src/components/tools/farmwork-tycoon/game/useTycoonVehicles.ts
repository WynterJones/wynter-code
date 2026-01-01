import type { VehicleSprite } from "./entities/Vehicle";
import type { FarmParticleEmitter } from "./particles/FarmParticleEmitter";
import { navigationSystem } from "./navigation/NavigationSystem";
import { BUILDING_POSITIONS, type BuildingType, type ActivityEvent } from "../types";
import { getRandomSpawnPoint } from "./navigation/SpawnPoints";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";

export function createVehicleUpdateLogic(
  vehicleSpritesRef: React.RefObject<Map<string, VehicleSprite>>,
  particleEmitterRef: React.RefObject<FarmParticleEmitter | null>,
  updateVehiclePosition: (id: string, position: { x: number; y: number }) => void,
  removeVehicle: (id: string) => void,
  addActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void
) {
  return (dt: number) => {
    // Read isPaused from store directly (not from closure) to ensure we get current value
    const currentIsPaused = useFarmworkTycoonStore.getState().isPaused;
    if (currentIsPaused) return;

    for (const vehicleSprite of vehicleSpritesRef.current?.values() || []) {
      // Skip processing if vehicle is already finished
      if (vehicleSprite.isMarkedFinished()) {
        continue;
      }

      const arrived = vehicleSprite.update(dt);
      const data = vehicleSprite.getData();

      updateVehiclePosition(data.id, data.position);

      // Check for vehicles waiting that should now exit (tool completed or beads issue closed)
      if ((data.task === "waiting_for_completion" || data.task === "waiting_at_office") && data.shouldExit) {
        // Start exiting
        vehicleSprite.setTask("exiting");
        const exitPoint = getRandomSpawnPoint("exit");
        const exitPath = navigationSystem.findPathToExit(data.position, exitPoint.id);
        if (exitPath && exitPath.length > 0) {
          vehicleSprite.setPath(exitPath);
        } else {
          vehicleSprite.markFinished();
          setTimeout(() => removeVehicle(data.id), 500);
        }
        continue;
      }

      // Handle traveling_to_farmhouse: when a bead vehicle needs to move from office to farmhouse
      if (data.task === "traveling_to_farmhouse" && data.path.length === 0) {
        // Calculate path to farmhouse
        const farmhouse = BUILDING_POSITIONS["farmhouse"];
        if (farmhouse) {
          const path = navigationSystem.findPath(data.position, { x: farmhouse.dockX, y: farmhouse.dockY });
          if (path && path.length > 0) {
            vehicleSprite.setPath(path);
          }
        }
      }

      // Fallback timeout: if waiting > 5 minutes, auto-exit (prevents orphaned vehicles)
      // Note: waiting_at_office vehicles (beads issues) don't have timeout - they wait until issue changes
      const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes
      if (
        data.task === "waiting_for_completion" &&
        !data.issueId && // Only timeout non-beads vehicles
        data.waitStartTime &&
        Date.now() - data.waitStartTime > MAX_WAIT_TIME
      ) {
        // Force exit after timeout
        vehicleSprite.setTask("exiting");
        const exitPoint = getRandomSpawnPoint("exit");
        const exitPath = navigationSystem.findPathToExit(data.position, exitPoint.id);
        if (exitPath && exitPath.length > 0) {
          vehicleSprite.setPath(exitPath);
        } else {
          vehicleSprite.markFinished();
          setTimeout(() => removeVehicle(data.id), 500);
        }
        continue;
      }

      // Beads vehicles auto-exit after 1 second in bead_completing state
      const BEAD_COMPLETION_WAIT = 1000; // 1 second
      if (
        data.task === "bead_completing" &&
        data.issueId &&
        data.waitStartTime &&
        Date.now() - data.waitStartTime > BEAD_COMPLETION_WAIT
      ) {
        // Mark issue as completed to prevent re-spawning
        useFarmworkTycoonStore.getState().markBeadIssueCompleted(data.issueId);
        useFarmworkTycoonStore.getState().removeBeadVehicle(data.issueId);

        // Start exiting
        vehicleSprite.setTask("exiting");
        const exitPoint = getRandomSpawnPoint("exit");
        const exitPath = navigationSystem.findPathToExit(data.position, exitPoint.id);
        if (exitPath && exitPath.length > 0) {
          vehicleSprite.setPath(exitPath);
        } else {
          vehicleSprite.markFinished();
          setTimeout(() => removeVehicle(data.id), 500);
        }
        continue;
      }

      if (arrived) {
        const currentDest = vehicleSprite.getCurrentDestination();
        const task = vehicleSprite.getTask();

        // Check if vehicle has arrived at exit point (task is exiting, no more route destinations)
        if (task === "exiting" && !currentDest) {
          // Vehicle has exited - remove it
          vehicleSprite.markFinished();
          setTimeout(() => {
            removeVehicle(data.id);
          }, 100);
          continue;
        }

        // Handle bead vehicle arriving at farmhouse after status change to in_progress
        if (task === "traveling_to_farmhouse") {
          vehicleSprite.setTask("bead_completing", "farmhouse");
          vehicleSprite.setPath([]);
          vehicleSprite.getData().waitStartTime = Date.now();
          continue;
        }

        // Handle bead vehicle arriving at office - start completion animation
        // When entering task completes and route leads to office
        if (data.issueId && currentDest === "office" && task !== "bead_completing" && task !== "exiting") {
          vehicleSprite.setTask("bead_completing", "office");
          vehicleSprite.setPath([]);
          vehicleSprite.getData().waitStartTime = Date.now();
          continue;
        }

        // Emit particles only on delivery (at farmhouse), not on pickup or exit
        if (currentDest && particleEmitterRef.current && task === "traveling_to_delivery") {
          const destBuilding = BUILDING_POSITIONS[currentDest as BuildingType];
          if (destBuilding) {
            particleEmitterRef.current.emitCargoDelivery({
              x: destBuilding.dockX,
              y: destBuilding.dockY,
            });
          }
        }

        addActivity({
          type: "vehicle_arrived",
          message: `Vehicle arrived at ${currentDest || "destination"}`,
          buildingId: currentDest || data.destination || undefined,
        });

        const routeComplete = vehicleSprite.advanceRoute();
        const nextTask = vehicleSprite.getTask();

        if (routeComplete && nextTask === "waiting_for_completion") {
          // Route complete - vehicle waits at building until tool completes
          vehicleSprite.setCarrying(false);

          // Clear path immediately to prevent re-triggering arrival detection
          vehicleSprite.setPath([]);
          // Vehicle will stay parked here until shouldExit flag is set
        } else if (routeComplete) {
          // Fallback: if route is complete but not waiting, mark as finished
          vehicleSprite.markFinished();
          setTimeout(() => {
            removeVehicle(data.id);
          }, 1000);
        } else {
          const nextDest = vehicleSprite.getCurrentDestination();

          if (nextDest) {
            // If traveling to farmhouse (delivery), set carrying = true
            if (nextTask === "traveling_to_delivery") {
              vehicleSprite.setCarrying(true);
            }

            const destBuilding = BUILDING_POSITIONS[nextDest as BuildingType];
            if (destBuilding) {
              const from = data.position;
              const to = { x: destBuilding.dockX, y: destBuilding.dockY };
              const path = navigationSystem.findPath(from, to);
              if (path && path.length > 0) {
                vehicleSprite.setPath(path);
              }
            }
          }
        }
      }
    }
  };
}

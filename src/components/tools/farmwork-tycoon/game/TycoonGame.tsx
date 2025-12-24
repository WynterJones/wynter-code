import { useEffect, useRef, useCallback, useState } from "react";
import { Application, Sprite, Graphics, Container, Assets } from "pixi.js";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { navigationSystem } from "./navigation/NavigationSystem";
import { BuildingSprite } from "./entities/Building";
import { VehicleSprite } from "./entities/Vehicle";
import { GardenFlowers } from "./entities/GardenFlowers";
import { FarmParticleEmitter } from "./particles/FarmParticleEmitter";
import { BUILDING_POSITIONS, type BuildingType } from "../types";
import { getRandomSpawnPoint } from "./navigation/SpawnPoints";

const GAME_SIZE = 1000;

interface TycoonGameProps {
  containerWidth?: number;
  containerHeight?: number;
  autoScale?: boolean;
  isMiniPlayer?: boolean;
}

export function TycoonGame({
  containerWidth,
  containerHeight,
  autoScale = true,
  isMiniPlayer = false
}: TycoonGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initializedRef = useRef(false);
  const appReadyRef = useRef(false); // true after app.init() completes
  const mountedRef = useRef(true);
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const vehicleSpritesRef = useRef<Map<string, VehicleSprite>>(new Map());
  const debugGraphicsRef = useRef<Graphics | null>(null);
  const bgSpriteRef = useRef<Sprite | null>(null);
  const gardenFlowersRef = useRef<GardenFlowers | null>(null);
  const particleEmitterRef = useRef<FarmParticleEmitter | null>(null);

  const [scale, setScale] = useState(1);

  const {
    buildings,
    vehicles,
    showDebug,
    isPaused,
    navGraph,
    setNavGraph,
    updateVehiclePosition,
    removeVehicle,
    addActivity,
    gardenStats,
    simulatedFlowerCount,
  } = useFarmworkTycoonStore();

  const initializeNavigation = useCallback(async () => {
    if (!navigationSystem.isInitialized()) {
      console.log("[Tycoon] Initializing navigation system...");
      const graph = await navigationSystem.initialize("/tycoon/map-mask.png", 16);
      console.log(`[Tycoon] Navigation initialized with ${graph.nodes.size} nodes`);
      setNavGraph(graph);
    }
  }, [setNavGraph]);

  const drawDebugOverlay = useCallback(
    (graphics: Graphics) => {
      graphics.clear();

      if (!showDebug) {
        console.log("[Tycoon] Debug overlay cleared (showDebug=false)");
        return;
      }

      console.log("[Tycoon] Drawing debug overlay...");

      // Draw walkable grid cells (road areas)
      const grid = navigationSystem.getGrid();
      console.log(`[Tycoon] Grid: ${grid ? `${grid.cols}x${grid.rows}` : 'null'}`);
      if (grid) {
        for (let gy = 0; gy < grid.rows; gy++) {
          for (let gx = 0; gx < grid.cols; gx++) {
            if (grid.isWalkable(gx, gy)) {
              const px = gx * grid.cellSize;
              const py = gy * grid.cellSize;
              graphics.rect(px, py, grid.cellSize, grid.cellSize);
              graphics.fill({ color: 0xffff00, alpha: 0.3 });
            }
          }
        }
      }

      if (!navGraph) return;

      // Draw path connections (thicker, more visible)
      for (const node of navGraph.nodes.values()) {
        for (const neighborId of node.neighbors) {
          const neighbor = navGraph.nodes.get(neighborId);
          if (neighbor) {
            graphics.moveTo(node.x, node.y);
            graphics.lineTo(neighbor.x, neighbor.y);
            graphics.stroke({ color: 0x00ff00, width: 3, alpha: 0.7 });
          }
        }
      }

      // Draw navigation nodes
      for (const node of navGraph.nodes.values()) {
        graphics.circle(node.x, node.y, 5);
        graphics.fill(0x00ff00);
      }

      // Draw building dock positions (where vehicles stop)
      for (const building of buildings) {
        const pos = building.position;
        graphics.circle(pos.dockX, pos.dockY, 8);
        graphics.fill(0xff00ff);
        graphics.stroke({ color: 0xffffff, width: 2 });
      }
    },
    [showDebug, navGraph, buildings]
  );

  // Initialize PixiJS app once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Local cancellation token for this specific effect invocation
    // This properly handles React Strict Mode's double-invoke pattern
    let cancelled = false;
    let localApp: Application | null = null;
    let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    mountedRef.current = true;

    const initApp = async () => {
      const app = new Application();
      localApp = app;

      // Calculate initial display size
      const initialDisplaySize = containerWidth !== undefined && containerHeight !== undefined
        ? Math.min(containerWidth, containerHeight)
        : 600;

      await app.init({
        width: initialDisplaySize,
        height: initialDisplaySize,
        backgroundColor: 0x1a1a1a,
        antialias: true,
        resolution: 1,
      });

      // Check if this effect was cancelled during async init
      if (cancelled || !app.stage) {
        try { app.destroy(true, { children: true, texture: true }); } catch {}
        return;
      }

      // Check if container already has a canvas (race condition protection)
      if (containerRef.current?.querySelector('canvas')) {
        try { app.destroy(true, { children: true, texture: true }); } catch {}
        return;
      }

      // Scale stage to fit the 1000x1000 game in the display size
      const initialScale = initialDisplaySize / GAME_SIZE;
      app.stage.scale.set(initialScale, initialScale);

      // Store refs and append canvas
      appRef.current = app;
      appReadyRef.current = true;
      initializedRef.current = true;
      containerRef.current?.appendChild(app.canvas);

      try {
        const bgTexture = await Assets.load("/tycoon/map.png");
        if (cancelled || !app.stage) return;
        const bg = new Sprite(bgTexture);
        bg.width = 1000;
        bg.height = 1000;
        bgSpriteRef.current = bg;
        app.stage.addChild(bg);
      } catch (e) {
        console.warn("Could not load map background:", e);
      }

      if (cancelled || !app.stage) return;

      const buildingsContainer = new Container();
      buildingsContainer.label = "buildings";
      app.stage.addChild(buildingsContainer);

      const gardenFlowers = new GardenFlowers();
      gardenFlowers.label = "gardenFlowers";
      app.stage.addChild(gardenFlowers);
      gardenFlowersRef.current = gardenFlowers;

      const vehiclesContainer = new Container();
      vehiclesContainer.label = "vehicles";
      app.stage.addChild(vehiclesContainer);

      const particleEmitter = new FarmParticleEmitter();
      particleEmitter.label = "particles";
      app.stage.addChild(particleEmitter);
      particleEmitterRef.current = particleEmitter;

      const debugGraphics = new Graphics();
      debugGraphics.label = "debug";
      app.stage.addChild(debugGraphics);
      debugGraphicsRef.current = debugGraphics;

      for (const buildingData of buildings) {
        const buildingSprite = new BuildingSprite(buildingData);
        buildingSprite.setDebugMode(useFarmworkTycoonStore.getState().showDebug);
        buildingsContainer.addChild(buildingSprite);
        buildingSpritesRef.current.set(buildingData.id, buildingSprite);
      }

      await initializeNavigation();

      if (cancelled) return;

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;

        if (gardenFlowersRef.current) {
          gardenFlowersRef.current.update(dt);
        }

        if (particleEmitterRef.current) {
          particleEmitterRef.current.update(dt);
        }

        for (const buildingSprite of buildingSpritesRef.current.values()) {
          buildingSprite.update(dt);
        }

        if (isPaused) return;

        for (const vehicleSprite of vehicleSpritesRef.current.values()) {
          // Skip processing if vehicle is already finished
          if (vehicleSprite.isMarkedFinished()) {
            continue;
          }

          const arrived = vehicleSprite.update(dt);
          const data = vehicleSprite.getData();

          updateVehiclePosition(data.id, data.position);

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

            if (routeComplete && nextTask === "exiting") {
              // Route complete - vehicle is at farmhouse, wait 200ms then exit
              vehicleSprite.setCarrying(false);

              // Clear path immediately to prevent re-triggering arrival detection
              // while waiting for the exit timeout
              vehicleSprite.setPath([]);

              // Capture sprite reference for timeout closure
              const sprite = vehicleSprite;
              const vehicleId = data.id;
              const currentPos = { ...data.position };

              setTimeout(() => {
                // Check if vehicle was already removed
                if (sprite.isMarkedFinished()) return;

                // Pick a random exit point
                const exitPoint = getRandomSpawnPoint("exit");
                const exitPath = navigationSystem.findPathToExit(currentPos, exitPoint.id);
                if (exitPath && exitPath.length > 0) {
                  sprite.setPath(exitPath);
                } else {
                  // If no path found, just remove the vehicle
                  sprite.markFinished();
                  setTimeout(() => removeVehicle(vehicleId), 500);
                }
              }, 200);
            } else if (routeComplete) {
              // Fallback: mark as finished if somehow route is complete but not exiting
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
      });

      keydownHandler = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === "g") {
          useFarmworkTycoonStore.getState().toggleDebug();
        }
      };
      window.addEventListener("keydown", keydownHandler);
    };

    initApp();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      // Remove keydown listener
      if (keydownHandler) {
        window.removeEventListener("keydown", keydownHandler);
      }

      // Destroy the PixiJS app
      if (localApp) {
        try {
          localApp.destroy(true, { children: true, texture: true });
        } catch (e) {
          console.warn("Error destroying PixiJS app:", e);
        }
      }

      // Clear any remaining canvas elements from container
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      initializedRef.current = false;
      appReadyRef.current = false;
      appRef.current = null;
      buildingSpritesRef.current.clear();
      vehicleSpritesRef.current.clear();
    };
  }, []);

  // Calculate scale based on container size
  useEffect(() => {
    if (!autoScale) {
      setScale(1);
      return;
    }

    const calculateScale = () => {
      if (containerWidth !== undefined && containerHeight !== undefined) {
        const newScale = Math.min(containerWidth, containerHeight) / GAME_SIZE;
        setScale(Math.min(1, newScale));
      } else if (containerRef.current) {
        const rect = containerRef.current.parentElement?.getBoundingClientRect();
        if (rect) {
          const newScale = Math.min(rect.width, rect.height) / GAME_SIZE;
          setScale(Math.min(1, newScale));
        }
      }
    };

    calculateScale();

    if (containerWidth === undefined || containerHeight === undefined) {
      const observer = new ResizeObserver(calculateScale);
      if (containerRef.current?.parentElement) {
        observer.observe(containerRef.current.parentElement);
      }
      return () => observer.disconnect();
    }
  }, [containerWidth, containerHeight, autoScale]);

  // Apply scale to renderer and stage
  useEffect(() => {
    if (!appRef.current || !appReadyRef.current) return;

    const app = appRef.current;
    if (!app.stage || !app.renderer) return;

    const displaySize = Math.round(GAME_SIZE * scale);

    // Resize the renderer to the display size
    app.renderer.resize(displaySize, displaySize);

    // Scale the stage so the 1000x1000 game fits in the display size
    app.stage.scale.set(scale, scale);
  }, [scale]);

  useEffect(() => {
    for (const buildingData of buildings) {
      const sprite = buildingSpritesRef.current.get(buildingData.id);
      if (sprite) {
        sprite.updateData(buildingData);
      }
    }
  }, [buildings]);

  useEffect(() => {
    if (!appRef.current?.stage) return;

    const vehiclesContainer = appRef.current.stage.children.find(
      (c) => c.label === "vehicles"
    ) as Container | undefined;

    if (!vehiclesContainer) return;

    const currentIds = new Set(vehicles.map((v) => v.id));

    for (const [id, sprite] of vehicleSpritesRef.current) {
      if (!currentIds.has(id)) {
        vehiclesContainer.removeChild(sprite);
        vehicleSpritesRef.current.delete(id);
      }
    }

    for (const vehicleData of vehicles) {
      let sprite = vehicleSpritesRef.current.get(vehicleData.id);

      if (!sprite) {
        sprite = new VehicleSprite(vehicleData);
        sprite.setBadgeVisible(!isMiniPlayer);
        vehiclesContainer.addChild(sprite);
        vehicleSpritesRef.current.set(vehicleData.id, sprite);

        const firstDest = vehicleData.route?.[0] || vehicleData.destination;

        if (firstDest && navGraph) {
          const destBuilding = buildings.find((b) => b.id === firstDest);
          if (destBuilding) {
            const to = { x: destBuilding.position.dockX, y: destBuilding.position.dockY };

            let path: ReturnType<typeof navigationSystem.findPath> = null;

            if (vehicleData.spawnPoint) {
              path = navigationSystem.findPathFromSpawn(vehicleData.spawnPoint, to);
            } else {
              const from = vehicleData.position;
              path = navigationSystem.findPath(from, to);
            }

            if (path && path.length > 0) {
              sprite.setPath(path);
              sprite.setTask("traveling_to_pickup", firstDest);
              console.log(`[Tycoon] Vehicle ${vehicleData.id} path set: ${path.length} waypoints`);
            } else {
              console.warn(`[Tycoon] No path found for vehicle ${vehicleData.id}`);
            }
          }
        } else if (!navGraph) {
          console.warn(`[Tycoon] NavGraph not ready for vehicle ${vehicleData.id}`);
        }
      } else {
        sprite.updateData(vehicleData);

        if (sprite.getData().path.length === 0 && navGraph) {
          const firstDest = vehicleData.route?.[0] || vehicleData.destination;
          const destBuilding = buildings.find((b) => b.id === firstDest);
          if (destBuilding) {
            const to = { x: destBuilding.position.dockX, y: destBuilding.position.dockY };

            let path: ReturnType<typeof navigationSystem.findPath> = null;

            if (vehicleData.spawnPoint) {
              path = navigationSystem.findPathFromSpawn(vehicleData.spawnPoint, to);
            } else {
              const from = vehicleData.position;
              path = navigationSystem.findPath(from, to);
            }

            if (path && path.length > 0) {
              sprite.setPath(path);
              sprite.setTask("traveling_to_pickup", firstDest || undefined);
              console.log(`[Tycoon] Late path set for ${vehicleData.id}: ${path.length} waypoints`);
            }
          }
        }
      }
    }
  }, [vehicles, navGraph, buildings, isMiniPlayer]);

  useEffect(() => {
    console.log(`[Tycoon] Debug toggle: showDebug=${showDebug}, hasGraphics=${!!debugGraphicsRef.current}, hasNavGraph=${!!navGraph}`);
    if (debugGraphicsRef.current) {
      drawDebugOverlay(debugGraphicsRef.current);
    }

    // Toggle building debug squares visibility
    for (const buildingSprite of buildingSpritesRef.current.values()) {
      buildingSprite.setDebugMode(showDebug);
    }
  }, [showDebug, drawDebugOverlay, navGraph]);

  useEffect(() => {
    if (!gardenFlowersRef.current) return;

    const flowerCount = simulatedFlowerCount !== null
      ? simulatedFlowerCount
      : gardenStats.activeIdeas;

    gardenFlowersRef.current.setFlowerCount(flowerCount);
  }, [gardenStats.activeIdeas, simulatedFlowerCount]);

  const displaySize = Math.round(GAME_SIZE * scale);

  return (
    <div
      ref={containerRef}
      className="relative bg-bg-tertiary rounded-lg overflow-hidden"
      style={{ width: displaySize, height: displaySize }}
    />
  );
}

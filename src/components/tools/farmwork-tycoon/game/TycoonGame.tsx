import { useEffect, useRef, useCallback, useState } from "react";
import { Application, Sprite, Graphics, Container, Assets } from "pixi.js";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { navigationSystem } from "./navigation/NavigationSystem";
import { BuildingSprite } from "./entities/Building";
import { VehicleSprite } from "./entities/Vehicle";
import { GardenFlowers } from "./entities/GardenFlowers";

const GAME_SIZE = 1000;

interface TycoonGameProps {
  containerWidth?: number;
  containerHeight?: number;
  autoScale?: boolean;
}

export function TycoonGame({
  containerWidth,
  containerHeight,
  autoScale = true
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

      if (!showDebug) return;

      // Draw walkable grid cells (road areas)
      const grid = navigationSystem.getGrid();
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
    if (!containerRef.current || initializedRef.current) return;

    // Mark as initializing immediately to prevent double-init in Strict Mode
    initializedRef.current = true;
    mountedRef.current = true;
    const app = new Application();
    appRef.current = app;

    const initApp = async () => {
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

      // Scale stage to fit the 1000x1000 game in the display size
      const initialScale = initialDisplaySize / GAME_SIZE;
      app.stage.scale.set(initialScale, initialScale);

      // Mark app as ready (renderer now exists)
      appReadyRef.current = true;

      if (!mountedRef.current || !containerRef.current) return;
      containerRef.current.appendChild(app.canvas);

      try {
        const bgTexture = await Assets.load("/tycoon/map.png");
        const bg = new Sprite(bgTexture);
        bg.width = 1000;
        bg.height = 1000;
        bgSpriteRef.current = bg;
        app.stage.addChild(bg);
      } catch (e) {
        console.warn("Could not load map background:", e);
      }

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

      const debugGraphics = new Graphics();
      debugGraphics.label = "debug";
      app.stage.addChild(debugGraphics);
      debugGraphicsRef.current = debugGraphics;

      for (const buildingData of buildings) {
        const buildingSprite = new BuildingSprite(buildingData);
        buildingsContainer.addChild(buildingSprite);
        buildingSpritesRef.current.set(buildingData.id, buildingSprite);
      }

      await initializeNavigation();

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;

        if (gardenFlowersRef.current) {
          gardenFlowersRef.current.update(dt);
        }

        if (isPaused) return;

        for (const vehicleSprite of vehicleSpritesRef.current.values()) {
          const arrived = vehicleSprite.update(dt);
          const data = vehicleSprite.getData();

          updateVehiclePosition(data.id, data.position);

          if (arrived && data.destination) {
            addActivity({
              type: "vehicle_arrived",
              message: `Vehicle arrived at ${data.destination}`,
              buildingId: data.destination,
            });

            setTimeout(() => {
              removeVehicle(data.id);
            }, 1000);
          }
        }

        if (debugGraphicsRef.current) {
          drawDebugOverlay(debugGraphicsRef.current);
        }
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === "g") {
          useFarmworkTycoonStore.getState().toggleDebug();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
    };

    initApp();

    return () => {
      mountedRef.current = false;

      // Destroy the PixiJS app
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: true });
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
    if (!appRef.current) return;

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
        vehiclesContainer.addChild(sprite);
        vehicleSpritesRef.current.set(vehicleData.id, sprite);

        if (vehicleData.destination) {
          const destBuilding = buildings.find(
            (b) => b.id === vehicleData.destination
          );
          if (destBuilding && navGraph) {
            const from = vehicleData.position;
            const to = { x: destBuilding.position.dockX, y: destBuilding.position.dockY };
            const path = navigationSystem.findPath(from, to);
            if (path && path.length > 0) {
              sprite.setPath(path);
              console.log(`[Tycoon] Vehicle ${vehicleData.id} path set: ${path.length} waypoints`);
            } else {
              console.warn(`[Tycoon] No path found from (${from.x.toFixed(0)}, ${from.y.toFixed(0)}) to (${to.x.toFixed(0)}, ${to.y.toFixed(0)})`);
            }
          } else if (!navGraph) {
            console.warn(`[Tycoon] NavGraph not ready for vehicle ${vehicleData.id}`);
          }
        }
      } else {
        sprite.updateData(vehicleData);

        // If vehicle has no path yet but has a destination, try to set path now
        if (vehicleData.destination && sprite.getData().path.length === 0 && navGraph) {
          const destBuilding = buildings.find(
            (b) => b.id === vehicleData.destination
          );
          if (destBuilding) {
            const from = vehicleData.position;
            const to = { x: destBuilding.position.dockX, y: destBuilding.position.dockY };
            const path = navigationSystem.findPath(from, to);
            if (path && path.length > 0) {
              sprite.setPath(path);
              console.log(`[Tycoon] Late path set for ${vehicleData.id}: ${path.length} waypoints`);
            }
          }
        }
      }
    }
  }, [vehicles, navGraph, buildings]);

  useEffect(() => {
    if (debugGraphicsRef.current) {
      drawDebugOverlay(debugGraphicsRef.current);
    }
  }, [showDebug, drawDebugOverlay]);

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

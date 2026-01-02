import { useEffect } from "react";
import { Application, Sprite, Graphics, Container, Assets } from "pixi.js";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import { navigationSystem } from "./navigation/NavigationSystem";
import { BuildingSprite } from "./entities/Building";
import { VehicleSprite } from "./entities/Vehicle";
import { GardenFlowers } from "./entities/GardenFlowers";
import { FireEffect } from "./entities/FireEffect";
import { FarmParticleEmitter } from "./particles/FarmParticleEmitter";
import { BuildingPopup } from "./BuildingPopup";
import { BUILDING_POSITIONS, type BuildingType } from "../types";
import { GAME_SIZE, MAP_PATHS } from "./tycoonConstants";
import { useTycoonGameState } from "./useTycoonGameState";
import { useTycoonNavigation } from "./useTycoonNavigation";
import { updateMapCycle } from "./useTycoonMapCycle";
import { createVehicleUpdateLogic } from "./useTycoonVehicles";

interface TycoonGameProps {
  containerWidth?: number;
  containerHeight?: number;
  autoScale?: boolean;
  isMiniPlayer?: boolean;
  onBuildingClick?: (buildingId: string) => void;
  initialSelectedBuilding?: string | null;
  onOpenAuditFile?: (buildingType: string) => void;
}

export function TycoonGame({
  containerWidth,
  containerHeight,
  autoScale = true,
  isMiniPlayer = false,
  onBuildingClick,
  initialSelectedBuilding = null,
  onOpenAuditFile,
}: TycoonGameProps) {
  const state = useTycoonGameState(initialSelectedBuilding);
  const {
    containerRef,
    appRef,
    initializedRef,
    appReadyRef,
    mountedRef,
    buildingSpritesRef,
    vehicleSpritesRef,
    debugGraphicsRef,
    gardenFlowersRef,
    particleEmitterRef,
    fireEffectRef,
    mapSpritesRef,
    scale,
    setScale,
    selectedBuilding,
    setSelectedBuilding,
    flowerTooltip,
    setFlowerTooltip,
    buildings,
    vehicles,
    showDebug,
    hideTooltips,
    navGraph,
    setNavGraph,
    updateVehiclePosition,
    removeVehicle,
    addActivity,
    gardenStats,
    simulatedFlowerCount,
    celebrationQueue,
    clearCelebrationQueue,
  } = state;

  const { initializeNavigation, drawDebugOverlay } = useTycoonNavigation(
    showDebug,
    navGraph,
    buildings,
    setNavGraph
  );

  // Initialize PixiJS app once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Local cancellation token for this specific effect invocation
    // This properly handles React Strict Mode's double-invoke pattern
    let cancelled = false;
    let localApp: Application | null = null;

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
        sharedTicker: false, // Use own ticker to avoid interference between instances
        preference: 'webgl', // Ensure WebGL renderer
      });

      // In standalone mode, set base path for assets
      const isStandalone = typeof window !== "undefined" && (window as { FARMWORK_STANDALONE_MODE?: boolean }).FARMWORK_STANDALONE_MODE;
      if (isStandalone) {
        // Assets are served from /farmwork/ base path
        Assets.resolver.basePath = "/farmwork/";
      }

      // Check if this effect was cancelled during async init
      if (cancelled || !app.stage) {
        try { app.destroy(true, { children: true, texture: false }); } catch { /* PixiJS cleanup */ }
        return;
      }

      // Check if container already has a canvas (race condition protection)
      if (containerRef.current?.querySelector('canvas')) {
        try { app.destroy(true, { children: true, texture: false }); } catch { /* PixiJS cleanup */ }
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

      // Load all map variants for day/night and seasonal cycling
      try {
        const mapContainer = new Container();
        mapContainer.label = "mapContainer";
        app.stage.addChild(mapContainer);

        // Load all map textures
        const mapKeys = Object.keys(MAP_PATHS);

        // Get current map cycle state from store to set initial alpha values
        const currentMapCycle = useFarmworkTycoonStore.getState().mapCycle;
        const currentMapKey = `${currentMapCycle.timeOfDay}-${currentMapCycle.season}`;

        for (const key of mapKeys) {
          const texture = await Assets.load(MAP_PATHS[key]);
          if (cancelled || !app.stage) return;

          const sprite = new Sprite(texture);
          sprite.width = 1000;
          sprite.height = 1000;
          // Set alpha based on current store state, not just day-summer default
          sprite.alpha = key === currentMapKey ? 1 : 0;
          mapContainer.addChild(sprite);
          mapSpritesRef.current.set(key, sprite);
        }
      } catch (error) {
        console.warn("Could not load map backgrounds:", error);
      }

      if (cancelled || !app.stage) return;

      const buildingsContainer = new Container();
      buildingsContainer.label = "buildings";
      app.stage.addChild(buildingsContainer);

      const gardenFlowers = new GardenFlowers();
      gardenFlowers.label = "gardenFlowers";
      app.stage.addChild(gardenFlowers);
      gardenFlowersRef.current = gardenFlowers;

      // Set initial flower count from store (in case effect ran before ref was set)
      const { gardenStats: initialGardenStats, simulatedFlowerCount: initialSimulated } = useFarmworkTycoonStore.getState();
      const initialFlowerCount = initialSimulated !== null ? initialSimulated : initialGardenStats.activeIdeas;
      gardenFlowers.setFlowerCount(initialFlowerCount);

      const vehiclesContainer = new Container();
      vehiclesContainer.label = "vehicles";
      app.stage.addChild(vehiclesContainer);

      const particleEmitter = new FarmParticleEmitter();
      particleEmitter.label = "particles";
      app.stage.addChild(particleEmitter);
      particleEmitterRef.current = particleEmitter;

      // Add fire effect at the compost fire pit
      const fireEffect = new FireEffect();
      fireEffect.label = "fireEffect";
      // Position at the fire pit (lower, near bottom edge of map)
      fireEffect.position.set(480, 940);
      app.stage.addChild(fireEffect);
      fireEffectRef.current = fireEffect;

      const debugGraphics = new Graphics();
      debugGraphics.label = "debug";
      app.stage.addChild(debugGraphics);
      debugGraphicsRef.current = debugGraphics;

      // Get current hideTooltips state for initial badge visibility
      const initialHideTooltips = useFarmworkTycoonStore.getState().hideTooltips;

      for (const buildingData of buildings) {
        const buildingSprite = new BuildingSprite(buildingData);
        buildingSprite.setDebugMode(useFarmworkTycoonStore.getState().showDebug);
        buildingSprite.setBadgeVisible(!initialHideTooltips);
        buildingsContainer.addChild(buildingSprite);
        buildingSpritesRef.current.set(buildingData.id, buildingSprite);

        // Add click handler for building popup
        if (isMiniPlayer && onBuildingClick) {
          // In mini player, trigger callback to expand and open building popup
          buildingSprite.on("pointerdown", () => {
            onBuildingClick(buildingData.id);
          });
        } else if (!isMiniPlayer) {
          // In full game view, open building popup directly
          buildingSprite.on("pointerdown", () => {
            setSelectedBuilding(buildingData.id);
          });
        }
      }

      await initializeNavigation();

      if (cancelled) return;

      // Create vehicle update logic
      const updateVehicles = createVehicleUpdateLogic(
        { current: vehicleSpritesRef.current },
        { current: particleEmitterRef.current },
        updateVehiclePosition,
        removeVehicle,
        addActivity
      );

      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;

        // Update map cycling via store (synced between mini player and full view)
        updateMapCycle(dt, mapSpritesRef.current);

        if (gardenFlowersRef.current) {
          gardenFlowersRef.current.update(dt);
        }

        if (particleEmitterRef.current) {
          particleEmitterRef.current.update(dt);
        }

        if (fireEffectRef.current) {
          fireEffectRef.current.update(dt);
        }

        for (const buildingSprite of buildingSpritesRef.current.values()) {
          buildingSprite.update(dt);
        }

        // Update all vehicles
        updateVehicles(dt);
      });

      // Explicitly start the ticker (required in some PixiJS v8 configurations)
      app.ticker.start();

      // Fallback: ensure ticker keeps running in mobile WebViews
      // Some mobile browsers throttle/pause requestAnimationFrame
      const tickerWatchdog = setInterval(() => {
        if (cancelled || !app.ticker) return;
        if (!app.ticker.started) {
          console.log("[TycoonGame] Restarting paused ticker");
          app.ticker.start();
        }
      }, 1000);

      // Store cleanup for this watchdog
      (app as unknown as { _tickerWatchdog?: ReturnType<typeof setInterval> })._tickerWatchdog = tickerWatchdog;
    };

    initApp();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      // Clean up the PixiJS app
      if (localApp) {
        try {
          // Clear ticker watchdog
          const watchdog = (localApp as unknown as { _tickerWatchdog?: ReturnType<typeof setInterval> })._tickerWatchdog;
          if (watchdog) clearInterval(watchdog);

          // Stop the ticker first to prevent any pending updates
          localApp.ticker?.stop();

          // Remove all children from the stage
          if (localApp.stage) {
            localApp.stage.removeChildren();
          }

          // Remove the canvas from DOM manually
          if (localApp.canvas?.parentNode) {
            localApp.canvas.parentNode.removeChild(localApp.canvas);
          }

          // Now destroy the app - don't destroy textures as they're shared via Assets cache
          // Use a more defensive destroy that catches internal PixiJS errors
          localApp.destroy(false, { children: false, texture: false });
        } catch (error) {
          // Suppress common PixiJS cleanup errors that don't affect functionality
          // These occur when components unmount before PixiJS is fully initialized
          // or when React's StrictMode causes double-cleanup
          const errorMsg = String(error);
          const suppressedErrors = [
            '_cancelResize',
            'textureBatch',
            'renderer.canvas',
            'this.renderer',
          ];
          if (!suppressedErrors.some(err => errorMsg.includes(err))) {
            console.warn("Error destroying PixiJS app:", error);
          }
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
      mapSpritesRef.current.clear();
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

  // Handle celebration queue - emit confetti for buildings that hit 10/10
  useEffect(() => {
    if (celebrationQueue.length === 0 || !particleEmitterRef.current) return;

    // Emit celebration particles for each building in queue
    for (const buildingId of celebrationQueue) {
      const building = buildings.find((b) => b.id === buildingId);
      if (building) {
        const position = {
          x: BUILDING_POSITIONS[building.type as BuildingType].dockX,
          y: BUILDING_POSITIONS[building.type as BuildingType].dockY - 30, // Above the dock
        };
        particleEmitterRef.current.emitCelebration(position);
      }
    }

    // Clear the celebration queue
    clearCelebrationQueue();
  }, [celebrationQueue, buildings, clearCelebrationQueue]);

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
        sprite.setBadgeVisible(!hideTooltips);
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
            }
          }
        }
      } else {
        sprite.updateData(vehicleData);

        // Only assign a new path if vehicle is not finished/exiting and has no current path
        // This prevents vehicles that completed their route from being re-routed
        if (sprite.getData().path.length === 0 && navGraph && !sprite.isMarkedFinished()) {
          const task = sprite.getTask();
          // Don't re-assign paths to vehicles that are exiting or have completed their tasks
          if (task !== "exiting" && task !== "finished") {
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
              }
            }
          }
        }
      }
    }
  }, [vehicles, navGraph, buildings, isMiniPlayer, hideTooltips]);

  useEffect(() => {
    if (debugGraphicsRef.current) {
      drawDebugOverlay(debugGraphicsRef.current);
    }

    // Toggle building debug squares visibility
    for (const buildingSprite of buildingSpritesRef.current.values()) {
      buildingSprite.setDebugMode(showDebug);
    }
  }, [showDebug, drawDebugOverlay, navGraph]);

  // Toggle badge visibility based on hideTooltips
  useEffect(() => {
    const badgeVisible = !hideTooltips;

    // Toggle building badges
    for (const buildingSprite of buildingSpritesRef.current.values()) {
      buildingSprite.setBadgeVisible(badgeVisible);
    }

    // Toggle vehicle badges
    for (const vehicleSprite of vehicleSpritesRef.current.values()) {
      vehicleSprite.setBadgeVisible(badgeVisible);
    }
  }, [hideTooltips]);

  useEffect(() => {
    if (!gardenFlowersRef.current) return;

    const flowerCount = simulatedFlowerCount !== null
      ? simulatedFlowerCount
      : gardenStats.activeIdeas;

    gardenFlowersRef.current.setFlowerCount(flowerCount);
    gardenFlowersRef.current.setIdeaNames(gardenStats.ideas);

    // Set up flower hover callback for tooltips (only in full game view)
    if (!isMiniPlayer) {
      gardenFlowersRef.current.setOnFlowerHover((ideaName, x, y) => {
        if (ideaName) {
          setFlowerTooltip({ text: ideaName, x: x * scale, y: y * scale });
        } else {
          setFlowerTooltip(null);
        }
      });

      // Set up garden click to open building popup
      gardenFlowersRef.current.setOnGardenClick(() => {
        setSelectedBuilding("garden");
      });
    }
  }, [gardenStats.activeIdeas, gardenStats.ideas, simulatedFlowerCount, scale, isMiniPlayer]);

  const displaySize = Math.round(GAME_SIZE * scale);

  return (
    <div
      ref={containerRef}
      className="relative bg-bg-tertiary rounded-lg overflow-hidden"
      style={{ width: displaySize, height: displaySize }}
    >
      {/* Building popup overlay */}
      {!isMiniPlayer && (
        <BuildingPopup
          buildingId={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
          onOpenAuditFile={onOpenAuditFile}
        />
      )}

      {/* Flower tooltip */}
      {!isMiniPlayer && !hideTooltips && flowerTooltip && (
        <div
          className="absolute pointer-events-none z-40 px-2 py-1 bg-bg-secondary/95 backdrop-blur-sm rounded-md border border-border/50 shadow-lg text-xs text-text-primary max-w-[200px] truncate"
          style={{
            left: flowerTooltip.x,
            top: flowerTooltip.y - 30,
            transform: "translateX(-50%)",
          }}
        >
          {flowerTooltip.text}
        </div>
      )}
    </div>
  );
}

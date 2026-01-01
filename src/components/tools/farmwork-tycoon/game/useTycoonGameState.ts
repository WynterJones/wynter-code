import { useRef, useState } from "react";
import type { Application, Graphics, Sprite } from "pixi.js";
import type { BuildingSprite } from "./entities/Building";
import type { VehicleSprite } from "./entities/Vehicle";
import type { GardenFlowers } from "./entities/GardenFlowers";
import type { FireEffect } from "./entities/FireEffect";
import type { FarmParticleEmitter } from "./particles/FarmParticleEmitter";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";

export function useTycoonGameState(initialSelectedBuilding: string | null = null) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const initializedRef = useRef(false);
  const appReadyRef = useRef(false);
  const mountedRef = useRef(true);
  const buildingSpritesRef = useRef<Map<string, BuildingSprite>>(new Map());
  const vehicleSpritesRef = useRef<Map<string, VehicleSprite>>(new Map());
  const debugGraphicsRef = useRef<Graphics | null>(null);
  const gardenFlowersRef = useRef<GardenFlowers | null>(null);
  const particleEmitterRef = useRef<FarmParticleEmitter | null>(null);
  const fireEffectRef = useRef<FireEffect | null>(null);
  const mapSpritesRef = useRef<Map<string, Sprite>>(new Map());

  // Local state
  const [scale, setScale] = useState(1);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(initialSelectedBuilding);
  const [flowerTooltip, setFlowerTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Store selectors
  const {
    buildings,
    vehicles,
    showDebug,
    hideTooltips,
    isPaused,
    navGraph,
    setNavGraph,
    updateVehiclePosition,
    removeVehicle,
    addActivity,
    gardenStats,
    simulatedFlowerCount,
    celebrationQueue,
    clearCelebrationQueue,
  } = useFarmworkTycoonStore();

  return {
    // Refs
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

    // State
    scale,
    setScale,
    selectedBuilding,
    setSelectedBuilding,
    flowerTooltip,
    setFlowerTooltip,

    // Store values
    buildings,
    vehicles,
    showDebug,
    hideTooltips,
    isPaused,
    navGraph,
    setNavGraph,
    updateVehiclePosition,
    removeVehicle,
    addActivity,
    gardenStats,
    simulatedFlowerCount,
    celebrationQueue,
    clearCelebrationQueue,
  };
}

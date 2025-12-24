import { Container } from "pixi.js";
import { ParticlePool, type ParticleConfig } from "./ParticlePool";
import type { Point, BuildingType } from "../../types";

export type ParticleType = "hay" | "leaves" | "stars" | "dust" | "sparkle";

export interface EmitterConfig {
  type: ParticleType;
  position: Point;
  count: number;
  spread?: number;
  lifetime?: number;
  speed?: number;
}

const PARTICLE_COLORS: Record<ParticleType, number[]> = {
  hay: [0xdaa520, 0xf4a460, 0xd2b48c],
  leaves: [0x228b22, 0x32cd32, 0x90ee90, 0xff8c00, 0xffa500],
  stars: [0xffd700, 0xffff00, 0xfffacd],
  dust: [0xd2b48c, 0xc4a96c, 0x8b7355],
  sparkle: [0xffffff, 0xffd700, 0x87ceeb],
};

export class FarmParticleEmitter extends Container {
  private pools: Map<ParticleType, ParticlePool> = new Map();

  constructor() {
    super();
    this.label = "particles";
    this.initPools();
  }

  private initPools(): void {
    const types: ParticleType[] = ["hay", "leaves", "stars", "dust", "sparkle"];

    for (const type of types) {
      const pool = new ParticlePool(this, [], 50, true);
      this.pools.set(type, pool);
    }
  }

  private getPool(type: ParticleType): ParticlePool | undefined {
    return this.pools.get(type);
  }

  emitParticles(config: EmitterConfig): void {
    const pool = this.getPool(config.type);
    if (!pool) return;

    const spread = config.spread ?? 30;
    const lifetime = config.lifetime ?? 1.2;
    const speed = config.speed ?? 80;
    const colors = PARTICLE_COLORS[config.type];

    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.5 + Math.random() * 0.5);

      const particleConfig: ParticleConfig = {
        velocity: {
          x: Math.cos(angle) * velocity * 0.3,
          y: -velocity * (0.8 + Math.random() * 0.4),
        },
        life: lifetime * (0.7 + Math.random() * 0.6),
        fadeOut: true,
        rotationSpeed: (Math.random() - 0.5) * 4,
        gravity: config.type === "dust" ? 20 : config.type === "hay" ? 60 : 40,
        scale: 0.5 + Math.random() * 0.5,
        tint: colors[Math.floor(Math.random() * colors.length)],
      };

      const particle = pool.acquire(particleConfig);
      if (particle) {
        const offsetX = (Math.random() - 0.5) * spread;
        const offsetY = (Math.random() - 0.5) * spread * 0.5;
        particle.sprite.position.set(
          config.position.x + offsetX,
          config.position.y + offsetY
        );
      }
    }
  }

  emitCargoDelivery(position: Point): void {
    this.emitParticles({
      type: "sparkle",
      position,
      count: 8,
      spread: 25,
      lifetime: 0.8,
      speed: 60,
    });

    this.emitParticles({
      type: "hay",
      position,
      count: 5,
      spread: 20,
      lifetime: 1.0,
      speed: 50,
    });

    this.emitParticles({
      type: "dust",
      position: { x: position.x, y: position.y + 10 },
      count: 4,
      spread: 30,
      lifetime: 0.6,
      speed: 30,
    });
  }

  emitBuildingActivity(position: Point, type: BuildingType): void {
    let particleType: ParticleType = "sparkle";

    switch (type) {
      case "garden":
        particleType = "leaves";
        break;
      case "compost":
        particleType = "dust";
        break;
      case "farmhouse":
      case "office":
        particleType = "sparkle";
        break;
      default:
        particleType = "stars";
    }

    this.emitParticles({
      type: particleType,
      position,
      count: 6,
      spread: 20,
      lifetime: 1.0,
      speed: 50,
    });
  }

  emitPickup(position: Point): void {
    this.emitParticles({
      type: "sparkle",
      position,
      count: 5,
      spread: 15,
      lifetime: 0.6,
      speed: 40,
    });
  }

  update(dt: number): void {
    for (const pool of this.pools.values()) {
      pool.update(dt);
    }
  }

  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  destroy(): void {
    for (const pool of this.pools.values()) {
      pool.destroy();
    }
    this.pools.clear();
    super.destroy();
  }

  getActiveParticleCount(): number {
    let count = 0;
    for (const pool of this.pools.values()) {
      count += pool.getActiveCount();
    }
    return count;
  }
}

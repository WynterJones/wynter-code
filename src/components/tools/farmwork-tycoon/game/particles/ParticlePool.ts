import { Container, Sprite, Texture, Graphics } from "pixi.js";
import type { Point } from "../../types";

export interface Particle {
  sprite: Sprite | Graphics;
  velocity: Point;
  life: number;
  maxLife: number;
  fadeOut: boolean;
  rotationSpeed: number;
  gravity: number;
  initialAlpha: number;
}

export interface ParticleConfig {
  velocity: Point;
  life: number;
  fadeOut?: boolean;
  rotationSpeed?: number;
  gravity?: number;
  scale?: number;
  alpha?: number;
  tint?: number;
}

export class ParticlePool {
  private pool: Particle[] = [];
  private active: Set<Particle> = new Set();
  private container: Container;
  private textures: Texture[];
  private maxSize: number;
  private useGraphics: boolean;

  constructor(
    container: Container,
    textures: Texture[],
    maxSize = 200,
    useGraphics = false
  ) {
    this.container = container;
    this.textures = textures;
    this.maxSize = maxSize;
    this.useGraphics = useGraphics;

    this.preallocate(Math.min(50, maxSize));
  }

  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.createParticle();
      particle.sprite.visible = false;
      this.pool.push(particle);
    }
  }

  private createParticle(): Particle {
    let sprite: Sprite | Graphics;

    if (this.useGraphics || this.textures.length === 0) {
      const g = new Graphics();
      g.circle(0, 0, 4);
      g.fill({ color: 0xffffff, alpha: 1 }); // White base so tint works
      sprite = g;
    } else {
      const texture =
        this.textures[Math.floor(Math.random() * this.textures.length)];
      sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
    }

    sprite.visible = false;
    this.container.addChild(sprite);

    return {
      sprite,
      velocity: { x: 0, y: 0 },
      life: 0,
      maxLife: 1,
      fadeOut: true,
      rotationSpeed: 0,
      gravity: 0,
      initialAlpha: 1,
    };
  }

  acquire(config: ParticleConfig): Particle | null {
    if (this.active.size >= this.maxSize) {
      return null;
    }

    let particle: Particle;

    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
    } else {
      particle = this.createParticle();
    }

    particle.velocity = { ...config.velocity };
    particle.life = config.life;
    particle.maxLife = config.life;
    particle.fadeOut = config.fadeOut ?? true;
    particle.rotationSpeed = config.rotationSpeed ?? 0;
    particle.gravity = config.gravity ?? 0;
    particle.initialAlpha = config.alpha ?? 1;

    particle.sprite.visible = true;
    particle.sprite.alpha = particle.initialAlpha;
    particle.sprite.scale.set(config.scale ?? 1);

    // Apply tint to both Sprites and Graphics
    if (config.tint !== undefined) {
      particle.sprite.tint = config.tint;
    }

    if (
      this.textures.length > 0 &&
      !this.useGraphics &&
      particle.sprite instanceof Sprite
    ) {
      particle.sprite.texture =
        this.textures[Math.floor(Math.random() * this.textures.length)];
    }

    this.active.add(particle);
    return particle;
  }

  release(particle: Particle): void {
    if (!this.active.has(particle)) return;

    particle.sprite.visible = false;
    particle.sprite.position.set(0, 0);
    particle.sprite.rotation = 0;
    particle.sprite.alpha = 1;

    this.active.delete(particle);
    this.pool.push(particle);
  }

  update(dt: number): void {
    const toRelease: Particle[] = [];

    for (const particle of this.active) {
      particle.life -= dt;

      if (particle.life <= 0) {
        toRelease.push(particle);
        continue;
      }

      particle.velocity.y += particle.gravity * dt;

      particle.sprite.x += particle.velocity.x * dt;
      particle.sprite.y += particle.velocity.y * dt;

      particle.sprite.rotation += particle.rotationSpeed * dt;

      if (particle.fadeOut) {
        const lifeRatio = particle.life / particle.maxLife;
        particle.sprite.alpha = lifeRatio * particle.initialAlpha;
      }
    }

    for (const particle of toRelease) {
      this.release(particle);
    }
  }

  clear(): void {
    for (const particle of this.active) {
      particle.sprite.visible = false;
      this.pool.push(particle);
    }
    this.active.clear();
  }

  getActiveCount(): number {
    return this.active.size;
  }

  destroy(): void {
    this.clear();
    for (const particle of this.pool) {
      particle.sprite.destroy();
    }
    this.pool = [];
  }
}

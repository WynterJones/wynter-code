import { Sprite, Container, Assets, Texture, Graphics } from "pixi.js";
import type { Vehicle as VehicleData, Point, VehicleDirection, VehicleType } from "../../types";
import { VEHICLE_SPRITE_PATHS } from "../../types";

const VEHICLE_COLORS: Record<VehicleType, number> = {
  "blue-truck": 0x3b82f6,
  "white-truck": 0xffffff,
  "tractor": 0x22c55e,
};

interface TextureSet {
  up: Texture;
  upFilled: Texture;
  left: Texture;
  leftFilled: Texture;
}

const textureCache: Map<VehicleType, TextureSet> = new Map();

async function loadVehicleTextures(type: VehicleType): Promise<TextureSet> {
  const cached = textureCache.get(type);
  if (cached) return cached;

  const paths = VEHICLE_SPRITE_PATHS[type];
  const [up, upFilled, left, leftFilled] = await Promise.all([
    Assets.load(paths.up),
    Assets.load(paths.upFilled),
    Assets.load(paths.left),
    Assets.load(paths.leftFilled),
  ]);

  const textures: TextureSet = { up, upFilled, left, leftFilled };
  textureCache.set(type, textures);
  return textures;
}

export class VehicleSprite extends Container {
  private data: VehicleData;
  private sprite: Sprite;
  private fallbackGraphic: Graphics;
  private textures: TextureSet | null = null;
  private arriveRadius = 8;
  private currentDirection: VehicleDirection = "up";
  private isCarrying = false;
  private isLoaded = false;

  constructor(data: VehicleData) {
    super();
    this.data = data;
    this.currentDirection = data.direction;
    this.isCarrying = data.carrying;

    // Fallback graphic (shown until textures load)
    this.fallbackGraphic = new Graphics();
    const color = VEHICLE_COLORS[data.type];
    this.fallbackGraphic.roundRect(-15, -20, 30, 40, 4);
    this.fallbackGraphic.fill(color);
    this.fallbackGraphic.stroke({ color: 0x000000, width: 2 });
    this.addChild(this.fallbackGraphic);

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.5);
    this.addChild(this.sprite);

    this.position.set(data.position.x, data.position.y);

    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    try {
      this.textures = await loadVehicleTextures(this.data.type);
      this.isLoaded = true;
      this.fallbackGraphic.visible = false; // Hide fallback once textures load
      this.updateTexture();
    } catch (e) {
      console.warn("Failed to load vehicle textures:", e);
      // Keep fallback visible if texture loading fails
    }
  }

  private updateTexture(): void {
    if (!this.textures || !this.isLoaded) return;

    let texture: Texture;
    const filled = this.isCarrying;

    switch (this.currentDirection) {
      case "up":
        texture = filled ? this.textures.upFilled : this.textures.up;
        this.sprite.scale.set(1, 1);
        break;
      case "down":
        texture = filled ? this.textures.upFilled : this.textures.up;
        this.sprite.scale.set(1, -1);
        break;
      case "left":
        texture = filled ? this.textures.leftFilled : this.textures.left;
        this.sprite.scale.set(1, 1);
        break;
      case "right":
        texture = filled ? this.textures.leftFilled : this.textures.left;
        this.sprite.scale.set(-1, 1);
        break;
    }

    this.sprite.texture = texture;
  }

  private getDirectionFromVelocity(vx: number, vy: number): VehicleDirection {
    const absX = Math.abs(vx);
    const absY = Math.abs(vy);

    if (absX > absY) {
      return vx > 0 ? "right" : "left";
    } else {
      return vy > 0 ? "down" : "up";
    }
  }

  update(dtSeconds: number): boolean {
    // If no path yet, wait (don't mark as arrived)
    if (this.data.path.length === 0) {
      return false;
    }

    // If we've completed the path, we've arrived
    if (this.data.pathIndex >= this.data.path.length) {
      return true;
    }

    const target = this.data.path[this.data.pathIndex];
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= this.arriveRadius) {
      this.data.pathIndex++;
      this.data.position = { x: this.position.x, y: this.position.y };
      return this.data.pathIndex >= this.data.path.length;
    }

    const speed = this.data.speed;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;

    this.position.x += vx * dtSeconds;
    this.position.y += vy * dtSeconds;
    this.data.position = { x: this.position.x, y: this.position.y };

    const newDirection = this.getDirectionFromVelocity(vx, vy);
    if (newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      this.data.direction = newDirection;
      this.updateTexture();
    }

    return false;
  }

  setPath(path: Point[]): void {
    this.data.path = path;
    this.data.pathIndex = 0;
  }

  getData(): VehicleData {
    return this.data;
  }

  updateData(data: VehicleData): void {
    const carryingChanged = this.isCarrying !== data.carrying;

    this.data = data;
    this.position.set(data.position.x, data.position.y);
    this.isCarrying = data.carrying;

    if (carryingChanged) {
      this.updateTexture();
    }
  }

  setCarrying(carrying: boolean): void {
    if (this.isCarrying !== carrying) {
      this.isCarrying = carrying;
      this.data.carrying = carrying;
      this.updateTexture();
    }
  }

  isAtDestination(): boolean {
    return this.data.path.length === 0 || this.data.pathIndex >= this.data.path.length;
  }
}

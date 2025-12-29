import { Sprite, Container, Assets, Texture, Graphics } from "pixi.js";
import type { Vehicle as VehicleData, Point, VehicleDirection, VehicleType, VehicleTaskStatus } from "../../types";
import { VEHICLE_SPRITE_PATHS } from "../../types";
import { VehicleBadge } from "./VehicleBadge";

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
  private badge: VehicleBadge;
  private isFinished = false;
  private tintColor: number = 0xffffff; // Default: no tint
  private pulseTimer = 0; // Timer for pulsing effect while waiting

  constructor(data: VehicleData) {
    super();
    this.data = data;
    this.currentDirection = data.direction;
    this.isCarrying = data.carrying;

    // Set tint color from data if provided
    if (data.tint !== undefined) {
      this.tintColor = data.tint;
    }

    // Fallback graphic (shown until textures load)
    this.fallbackGraphic = new Graphics();
    const color = VEHICLE_COLORS[data.type];
    this.fallbackGraphic.roundRect(-15, -20, 30, 40, 4);
    this.fallbackGraphic.fill(color);
    this.fallbackGraphic.stroke({ color: 0x000000, width: 2 });
    this.fallbackGraphic.scale.set(0.6);
    // Apply tint to fallback if set
    if (this.tintColor !== 0xffffff) {
      this.fallbackGraphic.tint = this.tintColor;
    }
    this.addChild(this.fallbackGraphic);

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.scale.set(0.6);
    this.addChild(this.sprite);

    this.badge = new VehicleBadge();
    this.badge.position.set(0, -30);
    this.badge.setBaseY(-30);
    this.addChild(this.badge);

    const currentDest = data.route?.[data.currentRouteIndex] ?? data.destination;
    this.badge.setTask(data.task ?? "entering", currentDest ?? undefined);

    this.position.set(data.position.x, data.position.y);

    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    try {
      this.textures = await loadVehicleTextures(this.data.type);
      this.isLoaded = true;
      this.fallbackGraphic.visible = false; // Hide fallback once textures load
      this.updateTexture();
      // Apply tint to sprite after textures load
      if (this.tintColor !== 0xffffff) {
        this.sprite.tint = this.tintColor;
      }
    } catch (e) {
      console.warn("Failed to load vehicle textures:", e);
      // Keep fallback visible if texture loading fails
    }
  }

  /**
   * Set the tint color for the vehicle sprite (used for tool call visualization)
   */
  setTint(color: number): void {
    this.tintColor = color;
    if (this.sprite) {
      this.sprite.tint = color;
    }
    if (this.fallbackGraphic) {
      this.fallbackGraphic.tint = color;
    }
  }

  /**
   * Get the current tint color
   */
  getTint(): number {
    return this.tintColor;
  }

  private updateTexture(): void {
    if (!this.textures || !this.isLoaded) return;

    let texture: Texture;
    const filled = this.isCarrying;
    const baseScale = 0.6;

    switch (this.currentDirection) {
      case "up":
        texture = filled ? this.textures.upFilled : this.textures.up;
        this.sprite.scale.set(baseScale, baseScale);
        break;
      case "down":
        texture = filled ? this.textures.upFilled : this.textures.up;
        this.sprite.scale.set(baseScale, -baseScale);
        break;
      case "left":
        texture = filled ? this.textures.leftFilled : this.textures.left;
        this.sprite.scale.set(-baseScale, baseScale); // Flip horizontally for left
        break;
      case "right":
        texture = filled ? this.textures.leftFilled : this.textures.left;
        this.sprite.scale.set(baseScale, baseScale); // No flip for right
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
    this.badge.update(dtSeconds);

    // If already finished, don't process further
    if (this.isFinished) {
      return false;
    }

    // Pulsing effect while waiting (for tool completion or at office for beads issues)
    if (this.data.task === "waiting_for_completion" || this.data.task === "waiting_at_office") {
      this.pulseTimer += dtSeconds;
      const pulse = Math.sin(this.pulseTimer * 3) * 0.08 + 1.0; // Gentle 0.92 to 1.08 scale
      this.sprite.scale.set(0.6 * pulse);
      this.fallbackGraphic.scale.set(0.6 * pulse);
    } else {
      // Reset pulse when not waiting
      this.pulseTimer = 0;
    }

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
    // If vehicle is already finished, don't allow state updates that might reset it
    if (this.isFinished) {
      return;
    }

    const carryingChanged = this.isCarrying !== data.carrying;

    // Preserve sprite-local state that the store doesn't track
    const currentPath = this.data.path;
    const currentPathIndex = this.data.pathIndex;
    const currentTask = this.data.task;
    const currentRouteIndex = this.data.currentRouteIndex;
    const currentWaitStartTime = this.data.waitStartTime;

    this.data = data;

    // Restore path if we had one (store doesn't track path state)
    if (currentPath.length > 0) {
      this.data.path = currentPath;
      this.data.pathIndex = currentPathIndex;
    }

    // Preserve task and route index - these are managed by the sprite, not the store
    // This prevents "exiting" vehicles from being reset to "entering" and re-routed
    this.data.task = currentTask;
    this.data.currentRouteIndex = currentRouteIndex;

    // Preserve waitStartTime if set (sprite-local)
    if (currentWaitStartTime) {
      this.data.waitStartTime = currentWaitStartTime;
    }

    // Sync shouldExit flag from store - this is how the bridge signals the vehicle to exit
    // This is intentionally synced FROM the store data, not preserved locally
    this.data.shouldExit = data.shouldExit;

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

  setTask(task: VehicleTaskStatus, destination?: string): void {
    this.data.task = task;
    this.badge.setTask(task, destination);
  }

  getTask(): VehicleTaskStatus {
    return this.data.task;
  }

  getCurrentDestination(): string | undefined {
    if (this.data.route && this.data.route.length > 0) {
      return this.data.route[this.data.currentRouteIndex];
    }
    return this.data.destination ?? undefined;
  }

  advanceRoute(): boolean {
    if (!this.data.route || this.data.route.length === 0) {
      return true;
    }

    this.data.currentRouteIndex++;

    if (this.data.currentRouteIndex >= this.data.route.length) {
      // Route complete - wait for tool completion signal before exiting
      const lastDest = this.data.route[this.data.route.length - 1];
      this.setTask("waiting_for_completion", lastDest);
      this.data.waitStartTime = Date.now();
      return true;
    }

    const nextDest = this.data.route[this.data.currentRouteIndex];
    this.setTask("traveling_to_delivery", nextDest);
    return false;
  }

  isAtDestination(): boolean {
    return this.data.path.length === 0 || this.data.pathIndex >= this.data.path.length;
  }

  markFinished(): void {
    this.isFinished = true;
    this.setTask("finished");
  }

  isMarkedFinished(): boolean {
    return this.isFinished;
  }

  setBadgeVisible(visible: boolean): void {
    this.badge.visible = visible;
  }
}

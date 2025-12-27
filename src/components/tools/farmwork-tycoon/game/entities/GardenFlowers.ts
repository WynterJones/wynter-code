import { Container, Sprite, Assets, Texture, Rectangle, Graphics } from "pixi.js";
import { BUILDING_POSITIONS } from "../../types";

const GRID_SIZE = 6;
const FLOWER_PATHS = [
  "/tycoon/flower1.png",
  "/tycoon/flower2.png",
  "/tycoon/flower3.png",
  "/tycoon/flower4.png",
];

interface FlowerSlot {
  sprite: Sprite;
  occupied: boolean;
  fadeTarget: number;
  ideaName: string | null;
}

export class GardenFlowers extends Container {
  private flowers: FlowerSlot[][] = [];
  private textures: Texture[] = [];
  private isLoaded = false;
  private gardenPos = BUILDING_POSITIONS.garden;
  private pendingFlowerCount: number | null = null;
  private pendingIdeaNames: string[] | null = null;
  private onFlowerHover: ((ideaName: string | null, x: number, y: number) => void) | null = null;
  private onGardenClick: (() => void) | null = null;
  private clickArea: Graphics | null = null;

  private cellWidth: number;
  private cellHeight: number;
  private padding = 20;
  private flowerScale = 0.8;

  constructor() {
    super();

    const innerWidth = this.gardenPos.width - this.padding * 2;
    const innerHeight = this.gardenPos.height - this.padding * 2;
    this.cellWidth = innerWidth / GRID_SIZE;
    this.cellHeight = innerHeight / GRID_SIZE;

    this.loadTextures();
  }

  private async loadTextures(): Promise<void> {
    try {
      this.textures = await Promise.all(
        FLOWER_PATHS.map((path) => Assets.load(path))
      );
      this.isLoaded = true;
      this.initializeGrid();
    } catch (e) {
      console.warn("Failed to load flower textures:", e);
    }
  }

  private initializeGrid(): void {
    // Create clickable background area for the whole garden
    this.clickArea = new Graphics();
    this.clickArea.rect(
      this.gardenPos.x,
      this.gardenPos.y,
      this.gardenPos.width,
      this.gardenPos.height
    );
    this.clickArea.fill({ color: 0x000000, alpha: 0 }); // Invisible fill
    this.clickArea.eventMode = "static";
    this.clickArea.cursor = "pointer";
    this.clickArea.on("pointerdown", () => {
      if (this.onGardenClick) {
        this.onGardenClick();
      }
    });
    this.addChild(this.clickArea);

    for (let row = 0; row < GRID_SIZE; row++) {
      this.flowers[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const texture = this.textures[Math.floor(Math.random() * this.textures.length)];
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 0.5);
        sprite.scale.set(this.flowerScale);
        sprite.alpha = 0;

        const x = this.gardenPos.x + this.padding + col * this.cellWidth + this.cellWidth / 2;
        const y = this.gardenPos.y + this.padding + row * this.cellHeight + this.cellHeight / 2;
        sprite.position.set(x, y);

        const randomRotation = (Math.random() - 0.5) * 0.3;
        sprite.rotation = randomRotation;

        // Set hitArea to match the cell size for easier hovering
        // The hitArea is relative to the sprite's local coordinates (centered due to anchor 0.5)
        sprite.hitArea = new Rectangle(
          -this.cellWidth / 2,
          -this.cellHeight / 2,
          this.cellWidth,
          this.cellHeight
        );

        // Make flower interactive for tooltips
        sprite.eventMode = "static";
        sprite.cursor = "pointer";

        const flowerRow = row;
        const flowerCol = col;
        sprite.on("pointerenter", () => {
          const slot = this.flowers[flowerRow]?.[flowerCol];
          if (slot?.occupied && slot.ideaName && this.onFlowerHover) {
            this.onFlowerHover(slot.ideaName, sprite.x, sprite.y);
          }
        });
        sprite.on("pointerleave", () => {
          if (this.onFlowerHover) {
            this.onFlowerHover(null, 0, 0);
          }
        });

        this.addChild(sprite);
        this.flowers[row][col] = {
          sprite,
          occupied: false,
          fadeTarget: 0,
          ideaName: null,
        };
      }
    }

    // Apply any pending flower count that was set before textures loaded
    if (this.pendingFlowerCount !== null) {
      this.setFlowerCount(this.pendingFlowerCount);
      this.pendingFlowerCount = null;
    }

    // Apply any pending idea names
    if (this.pendingIdeaNames !== null) {
      this.setIdeaNames(this.pendingIdeaNames);
      this.pendingIdeaNames = null;
    }
  }

  setFlowerCount(count: number): void {
    if (!this.isLoaded) {
      // Store for later when textures finish loading
      this.pendingFlowerCount = count;
      return;
    }

    const maxFlowers = GRID_SIZE * GRID_SIZE;
    const targetCount = Math.min(count, maxFlowers);

    let currentIndex = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (!slot) continue;

        const shouldBeOccupied = currentIndex < targetCount;
        slot.occupied = shouldBeOccupied;
        slot.fadeTarget = shouldBeOccupied ? 1 : 0;
        currentIndex++;
      }
    }
  }

  showFlowerAt(index: number): void {
    if (!this.isLoaded) return;

    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const slot = this.flowers[row]?.[col];

    if (slot) {
      slot.occupied = true;
      slot.fadeTarget = 1;

      const newTexture = this.textures[Math.floor(Math.random() * this.textures.length)];
      slot.sprite.texture = newTexture;
    }
  }

  hideFlowerAt(index: number): void {
    if (!this.isLoaded) return;

    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const slot = this.flowers[row]?.[col];

    if (slot) {
      slot.occupied = false;
      slot.fadeTarget = 0;
    }
  }

  showRandomFlower(): number {
    if (!this.isLoaded) return -1;

    const emptySlots: number[] = [];
    let index = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (slot && !slot.occupied) {
          emptySlots.push(index);
        }
        index++;
      }
    }

    if (emptySlots.length === 0) return -1;

    const randomIndex = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    this.showFlowerAt(randomIndex);
    return randomIndex;
  }

  hideRandomFlower(): number {
    if (!this.isLoaded) return -1;

    const occupiedSlots: number[] = [];
    let index = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (slot && slot.occupied) {
          occupiedSlots.push(index);
        }
        index++;
      }
    }

    if (occupiedSlots.length === 0) return -1;

    const randomIndex = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
    this.hideFlowerAt(randomIndex);
    return randomIndex;
  }

  clearAll(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (slot) {
          slot.occupied = false;
          slot.fadeTarget = 0;
        }
      }
    }
  }

  update(dt: number): void {
    if (!this.isLoaded) return;

    const fadeSpeed = 3;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (!slot) continue;

        const diff = slot.fadeTarget - slot.sprite.alpha;
        if (Math.abs(diff) > 0.01) {
          slot.sprite.alpha += diff * fadeSpeed * dt;
        } else {
          slot.sprite.alpha = slot.fadeTarget;
        }
      }
    }
  }

  getOccupiedCount(): number {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.flowers[row]?.[col]?.occupied) {
          count++;
        }
      }
    }
    return count;
  }

  setIdeaNames(names: string[]): void {
    if (!this.isLoaded) {
      this.pendingIdeaNames = names;
      return;
    }

    let currentIndex = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.flowers[row]?.[col];
        if (!slot) continue;

        if (currentIndex < names.length) {
          slot.ideaName = names[currentIndex];
        } else {
          slot.ideaName = null;
        }
        currentIndex++;
      }
    }
  }

  setOnFlowerHover(callback: ((ideaName: string | null, x: number, y: number) => void) | null): void {
    this.onFlowerHover = callback;
  }

  setOnGardenClick(callback: (() => void) | null): void {
    this.onGardenClick = callback;
  }

  getGardenBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.gardenPos.x,
      y: this.gardenPos.y,
      width: this.gardenPos.width,
      height: this.gardenPos.height,
    };
  }
}

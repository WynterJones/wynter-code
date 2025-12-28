import { Container, Graphics, BlurFilter } from "pixi.js";

interface FireParticle {
  graphics: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

// Fire colors from hot (bottom) to cooler (top)
const FIRE_COLORS = [
  0xffff00, // Yellow (hottest)
  0xffa500, // Orange
  0xff6600, // Dark orange
  0xff4500, // Red-orange
  0xff0000, // Red
  0xcc0000, // Dark red
];

export class FireEffect extends Container {
  private particles: FireParticle[] = [];
  private glowGraphics: Graphics;
  private glowPhase = 0;
  private emitTimer = 0;
  private readonly emitRate = 0.05; // Emit every 50ms (slower)
  private readonly maxParticles = 30;
  private readonly fireWidth = 45;

  constructor() {
    super();
    this.label = "fireEffect";

    // Create glow effect (rendered behind particles)
    this.glowGraphics = new Graphics();
    this.glowGraphics.filters = [new BlurFilter({ strength: 15 })];
    this.addChild(this.glowGraphics);

    // Initial glow
    this.drawGlow(1);
  }

  private drawGlow(intensity: number): void {
    this.glowGraphics.clear();

    // Outer glow (larger, more transparent)
    this.glowGraphics.circle(0, -20, 60 * intensity);
    this.glowGraphics.fill({ color: 0xff4500, alpha: 0.15 * intensity });

    // Middle glow
    this.glowGraphics.circle(0, -15, 40 * intensity);
    this.glowGraphics.fill({ color: 0xff6600, alpha: 0.25 * intensity });

    // Inner glow (brighter)
    this.glowGraphics.circle(0, -10, 25 * intensity);
    this.glowGraphics.fill({ color: 0xffa500, alpha: 0.4 * intensity });

    // Core glow
    this.glowGraphics.circle(0, -5, 15 * intensity);
    this.glowGraphics.fill({ color: 0xffcc00, alpha: 0.5 * intensity });
  }

  private createParticle(): void {
    if (this.particles.length >= this.maxParticles) return;

    const graphics = new Graphics();

    // Random starting position at the base of the fire
    const x = (Math.random() - 0.5) * this.fireWidth;
    const y = 0;

    // Upward velocity with some horizontal drift (slower)
    const vx = (Math.random() - 0.5) * 20;
    const vy = -25 - Math.random() * 25; // Upward (slower)

    // Random life and size (longer life for slower movement)
    const maxLife = 1.2 + Math.random() * 0.8;
    const size = 3 + Math.random() * 5;

    // Start with hot color
    const color = FIRE_COLORS[0];

    const particle: FireParticle = {
      graphics,
      x,
      y,
      vx,
      vy,
      life: maxLife,
      maxLife,
      size,
      color,
    };

    this.drawParticle(particle);
    this.addChild(graphics);
    this.particles.push(particle);
  }

  private drawParticle(particle: FireParticle): void {
    const { graphics, size, life, maxLife } = particle;
    const lifeRatio = life / maxLife;

    graphics.clear();

    // Particle shrinks as it rises
    const currentSize = size * lifeRatio;

    // Color transitions from yellow to red as particle rises
    const colorIndex = Math.min(
      FIRE_COLORS.length - 1,
      Math.floor((1 - lifeRatio) * FIRE_COLORS.length)
    );
    const currentColor = FIRE_COLORS[colorIndex];

    // Draw flame particle (teardrop shape pointing up)
    graphics.circle(0, 0, currentSize);
    graphics.fill({ color: currentColor, alpha: lifeRatio * 0.8 });

    // Add inner bright core
    if (lifeRatio > 0.5) {
      graphics.circle(0, 0, currentSize * 0.5);
      graphics.fill({ color: 0xffffaa, alpha: (lifeRatio - 0.5) * 0.6 });
    }
  }

  update(dt: number): void {
    // Update glow pulsing (slower)
    this.glowPhase += dt * 1.5;
    const glowIntensity = 0.85 + Math.sin(this.glowPhase) * 0.15 + Math.sin(this.glowPhase * 2.3) * 0.08;
    this.drawGlow(glowIntensity);

    // Emit new particles
    this.emitTimer += dt;
    while (this.emitTimer >= this.emitRate) {
      this.emitTimer -= this.emitRate;
      this.createParticle();
      // Sometimes emit 2 for variation
      if (Math.random() < 0.3) {
        this.createParticle();
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update life
      particle.life -= dt;

      if (particle.life <= 0) {
        // Remove dead particle
        this.removeChild(particle.graphics);
        particle.graphics.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      // Update position with some turbulence (gentler)
      const turbulence = Math.sin(particle.life * 6 + particle.x) * 6;
      particle.x += (particle.vx + turbulence) * dt;
      particle.y += particle.vy * dt;

      // Slow down as it rises
      particle.vy *= 0.99;

      // Update graphics position
      particle.graphics.position.set(particle.x, particle.y);

      // Redraw with new color/size
      this.drawParticle(particle);
    }
  }

  destroy(): void {
    for (const particle of this.particles) {
      particle.graphics.destroy();
    }
    this.particles = [];
    this.glowGraphics.destroy();
    super.destroy();
  }
}

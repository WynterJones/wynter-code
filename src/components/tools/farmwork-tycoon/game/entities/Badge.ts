import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface BadgeConfig {
  text: string;
  backgroundColor?: number;
  textColor?: number;
  floating?: boolean;
  minWidth?: number;
  fontSize?: number;
  padding?: number;
}

export class Badge extends Container {
  protected background: Graphics;
  protected textLabel: Text;
  protected config: BadgeConfig;

  protected bobPhase = 0;
  protected bobAmplitude = 3;
  protected bobSpeed = 2;
  protected baseY = 0;

  protected pulsePhase = 0;
  protected isPulsing = false;
  protected pulseScale = 1;

  constructor(config: BadgeConfig) {
    super();

    this.config = {
      backgroundColor: 0x1a1a2e,
      textColor: 0xffffff,
      floating: true,
      minWidth: 60,
      fontSize: 10,
      padding: 6,
      ...config,
    };

    this.background = new Graphics();
    this.addChild(this.background);

    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: this.config.fontSize,
      fontWeight: "bold",
      fill: this.config.textColor,
    });

    this.textLabel = new Text({ text: this.config.text, style });
    this.textLabel.anchor.set(0.5);
    this.addChild(this.textLabel);

    this.drawBackground();
  }

  protected drawBackground(): void {
    const padding = this.config.padding!;
    const textWidth = this.textLabel.width;
    const textHeight = this.textLabel.height;

    const width = Math.max(this.config.minWidth!, textWidth + padding * 2);
    const height = textHeight + padding * 2;

    this.background.clear();
    this.background.roundRect(
      -width / 2,
      -height / 2,
      width,
      height,
      height / 2
    );
    this.background.fill({ color: this.config.backgroundColor!, alpha: 0.9 });
    this.background.stroke({ color: 0x3a3a5e, width: 1, alpha: 0.5 });
  }

  setText(text: string): void {
    if (this.textLabel.text === text) return;
    this.textLabel.text = text;
    this.drawBackground();
  }

  setBackgroundColor(color: number): void {
    this.config.backgroundColor = color;
    this.drawBackground();
  }

  setTextColor(color: number): void {
    this.config.textColor = color;
    this.textLabel.style.fill = color;
  }

  startPulse(): void {
    this.isPulsing = true;
    this.pulsePhase = 0;
  }

  stopPulse(): void {
    this.isPulsing = false;
    this.scale.set(1);
  }

  update(dt: number): void {
    if (this.config.floating) {
      this.bobPhase += this.bobSpeed * dt;
      const bobOffset = Math.sin(this.bobPhase) * this.bobAmplitude;
      this.y = this.baseY + bobOffset;
    }

    if (this.isPulsing) {
      this.pulsePhase += dt * 8;
      const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
      this.scale.set(pulse);

      if (this.pulsePhase > Math.PI * 4) {
        this.stopPulse();
      }
    }
  }

  setBaseY(y: number): void {
    this.baseY = y;
    this.y = y;
  }

  setFloating(floating: boolean): void {
    this.config.floating = floating;
  }
}

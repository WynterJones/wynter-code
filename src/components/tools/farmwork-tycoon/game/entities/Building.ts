import { Graphics, Text, Container } from "pixi.js";
import type { Building as BuildingData, BuildingActivity } from "../../types";
import { BuildingBadge } from "./BuildingBadge";

export class BuildingSprite extends Container {
  private data: BuildingData;
  private background: Graphics;
  private nameLabel: Text;
  private scoreText: Text;
  private activityIndicator: Graphics;
  private badge: BuildingBadge;

  private pulsePhase = 0;
  private activityPulseScale = 1;

  constructor(data: BuildingData) {
    super();
    this.data = data;

    const { x, y, width, height } = data.position;

    // Debug background (hidden by default, shown in debug mode)
    this.background = new Graphics();
    this.drawBackground();
    this.background.visible = false;
    this.addChild(this.background);

    // Debug labels (hidden by default)
    this.nameLabel = new Text({
      text: data.name,
      style: {
        fontFamily: "Arial",
        fontSize: 14,
        fill: 0xffffff,
        align: "center",
        fontWeight: "bold",
      },
    });
    this.nameLabel.anchor.set(0.5);
    this.nameLabel.position.set(width / 2, height / 2 - 10);
    this.nameLabel.visible = false;
    this.addChild(this.nameLabel);

    this.scoreText = new Text({
      text: `${data.score.toFixed(1)}/10`,
      style: {
        fontFamily: "Arial",
        fontSize: 12,
        fill: 0xffffff,
        align: "center",
      },
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.position.set(width / 2, height / 2 + 10);
    this.scoreText.visible = false;
    this.addChild(this.scoreText);

    this.activityIndicator = new Graphics();
    this.activityIndicator.position.set(width - 15, 10);
    this.activityIndicator.visible = false;
    this.addChild(this.activityIndicator);
    this.updateActivityIndicator();

    this.badge = new BuildingBadge(data);
    this.badge.position.set(width / 2, -18);
    this.badge.setBaseY(-18);
    this.addChild(this.badge);

    // Position at top-left corner
    this.position.set(x, y);
    this.eventMode = "static";
    this.cursor = "pointer";
  }

  private drawBackground(): void {
    const { width, height } = this.data.position;
    const color = parseInt(this.data.color.replace("#", ""), 16);
    const alpha = this.getAlphaForScore(this.data.score);

    this.background.clear();
    this.background.roundRect(0, 0, width, height, 8);
    this.background.fill({ color, alpha });
    this.background.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
  }

  private getAlphaForScore(score: number): number {
    if (score < 3) return 0.4;
    if (score < 6) return 0.6;
    if (score < 8) return 0.8;
    return 1.0;
  }

  private updateActivityIndicator(): void {
    this.activityIndicator.clear();

    const colors: Record<BuildingActivity, number> = {
      idle: 0x6b7280,
      working: 0x22c55e,
      alert: 0xef4444,
    };

    const color = colors[this.data.activity];
    this.activityIndicator.circle(0, 0, 5);
    this.activityIndicator.fill(color);

    if (this.data.activity === "working") {
      this.activityIndicator.circle(0, 0, 7);
      this.activityIndicator.stroke({ color, width: 1, alpha: 0.5 });
    }
  }

  update(dt: number): void {
    this.badge.update(dt);

    if (this.data.activity === "working") {
      this.pulsePhase += dt * 5;
      this.activityPulseScale = 1 + Math.sin(this.pulsePhase) * 0.3;
      this.activityIndicator.scale.set(this.activityPulseScale);
    } else {
      this.activityIndicator.scale.set(1);
      this.pulsePhase = 0;
    }
  }

  updateData(data: BuildingData): void {
    const scoreChanged = this.data.score !== data.score;
    this.data = data;
    this.drawBackground();
    this.scoreText.text = `${data.score.toFixed(1)}/10`;
    this.updateActivityIndicator();

    if (scoreChanged) {
      this.badge.updateFromBuilding(data);
    }
  }

  setActivity(activity: BuildingActivity): void {
    this.data.activity = activity;
    this.updateActivityIndicator();
  }

  highlight(enabled: boolean): void {
    if (enabled) {
      this.background.tint = 0xffffcc;
    } else {
      this.background.tint = 0xffffff;
    }
  }

  setDebugMode(enabled: boolean): void {
    // Debug elements only visible in debug mode
    this.background.visible = enabled;
    this.nameLabel.visible = enabled;
    this.scoreText.visible = enabled;
    this.activityIndicator.visible = enabled;
  }

  setBadgeVisible(visible: boolean): void {
    this.badge.alpha = visible ? 1 : 0;
  }

  getData(): BuildingData {
    return this.data;
  }
}

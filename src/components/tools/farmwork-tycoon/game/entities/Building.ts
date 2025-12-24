import { Graphics, Text, Container } from "pixi.js";
import type { Building as BuildingData, BuildingActivity } from "../../types";

export class BuildingSprite extends Container {
  private data: BuildingData;
  private background: Graphics;
  private nameLabel: Text;
  private scoreText: Text;
  private activityIndicator: Graphics;

  constructor(data: BuildingData) {
    super();
    this.data = data;

    const { x, y, width, height } = data.position;

    this.background = new Graphics();
    this.drawBackground();
    this.addChild(this.background);

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
    this.addChild(this.scoreText);

    this.activityIndicator = new Graphics();
    this.activityIndicator.position.set(width - 15, 10);
    this.addChild(this.activityIndicator);
    this.updateActivityIndicator();

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

  updateData(data: BuildingData): void {
    this.data = data;
    this.drawBackground();
    this.scoreText.text = `${data.score.toFixed(1)}/10`;
    this.updateActivityIndicator();
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

  getData(): BuildingData {
    return this.data;
  }
}

import { Graphics, Text, TextStyle } from "pixi.js";
import { Badge } from "./Badge";
import type {
  Building,
  BuildingType,
} from "../../types";
import { BUILDING_COLORS, BUILDING_NAMES } from "../../types";

export class BuildingBadge extends Badge {
  private buildingType: BuildingType;
  private iconGraphic: Graphics;
  private scoreLabel: Text;
  private nameLabel: Text;
  private currentScore = 0;

  constructor(building: Building) {
    super({
      text: "",
      floating: true,
      minWidth: 100,
      fontSize: 16,
      padding: 12,
    });

    this.buildingType = building.type;
    this.currentScore = building.score;

    this.textLabel.visible = false;

    this.iconGraphic = new Graphics();
    this.addChild(this.iconGraphic);

    const scoreStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "bold",
      fill: 0xffffff,
    });

    this.scoreLabel = new Text({ text: this.formatScore(building.score), style: scoreStyle });
    this.scoreLabel.anchor.set(0, 0.5);
    this.addChild(this.scoreLabel);

    const nameStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "normal",
      fill: 0x888888,
    });

    this.nameLabel = new Text({ text: BUILDING_NAMES[this.buildingType], style: nameStyle });
    this.nameLabel.anchor.set(0.5, 0);
    this.addChild(this.nameLabel);

    this.drawBuildingBadge();
    this.updateScore(building.score);
  }

  private formatScore(score: number): string {
    // Garden, compost, and office (Home) show counts, not scores
    if (this.buildingType === "garden" || this.buildingType === "compost" || this.buildingType === "office") {
      return `${Math.floor(score)}`;
    }
    return `${score.toFixed(1)}/10`;
  }

  private drawBuildingBadge(): void {
    const baseColor = this.getScoreColor(this.currentScore);

    const iconSize = 22;
    const scoreWidth = this.scoreLabel.width;
    const gap = 8;
    const padding = 12;
    const nameHeight = 14;

    const totalContentWidth = iconSize + gap + scoreWidth;
    const width = Math.max(totalContentWidth + padding * 2, this.nameLabel.width + padding * 2);
    const height = 36 + nameHeight;

    this.background.clear();
    this.background.roundRect(-width / 2, -height / 2, width, height, 8);
    this.background.fill({ color: 0x1a1a2e, alpha: 0.92 });
    this.background.stroke({ color: baseColor, width: 2, alpha: 0.8 });

    this.drawIcon(baseColor, iconSize);

    const startX = -totalContentWidth / 2;
    const topRowY = -nameHeight / 2;
    this.iconGraphic.x = startX + iconSize / 2;
    this.iconGraphic.y = topRowY;
    this.scoreLabel.x = startX + iconSize + gap;
    this.scoreLabel.y = topRowY;

    // Position name label below
    this.nameLabel.x = 0;
    this.nameLabel.y = topRowY + 12;
  }

  private drawIcon(color: number, size: number): void {
    this.iconGraphic.clear();

    const half = size / 2;

    switch (this.buildingType) {
      case "security":
        this.iconGraphic.moveTo(0, -half);
        this.iconGraphic.lineTo(half, -half * 0.5);
        this.iconGraphic.lineTo(half, half * 0.3);
        this.iconGraphic.lineTo(0, half);
        this.iconGraphic.lineTo(-half, half * 0.3);
        this.iconGraphic.lineTo(-half, -half * 0.5);
        this.iconGraphic.closePath();
        this.iconGraphic.fill({ color, alpha: 0.9 });
        break;

      case "tests":
        this.iconGraphic.roundRect(-half * 0.4, -half, half * 0.8, half * 1.6, 2);
        this.iconGraphic.fill({ color, alpha: 0.9 });
        this.iconGraphic.circle(0, half * 0.5, half * 0.35);
        this.iconGraphic.fill({ color, alpha: 0.9 });
        break;

      case "performance":
        this.iconGraphic.circle(0, 0, half);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        this.iconGraphic.moveTo(0, 0);
        this.iconGraphic.lineTo(half * 0.5, -half * 0.5);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        break;

      case "accessibility":
        this.iconGraphic.circle(0, -half * 0.5, half * 0.35);
        this.iconGraphic.fill({ color, alpha: 0.9 });
        this.iconGraphic.moveTo(0, -half * 0.15);
        this.iconGraphic.lineTo(0, half * 0.4);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        this.iconGraphic.moveTo(-half * 0.5, half);
        this.iconGraphic.lineTo(0, half * 0.4);
        this.iconGraphic.lineTo(half * 0.5, half);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        break;

      case "codeQuality":
        this.iconGraphic.moveTo(-half * 0.5, -half * 0.3);
        this.iconGraphic.lineTo(-half, 0);
        this.iconGraphic.lineTo(-half * 0.5, half * 0.3);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        this.iconGraphic.moveTo(half * 0.5, -half * 0.3);
        this.iconGraphic.lineTo(half, 0);
        this.iconGraphic.lineTo(half * 0.5, half * 0.3);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        break;

      case "farmhouse":
      case "office":
        this.iconGraphic.moveTo(0, -half);
        this.iconGraphic.lineTo(half, -half * 0.2);
        this.iconGraphic.lineTo(half, half);
        this.iconGraphic.lineTo(-half, half);
        this.iconGraphic.lineTo(-half, -half * 0.2);
        this.iconGraphic.closePath();
        this.iconGraphic.fill({ color, alpha: 0.9 });
        break;

      case "garden":
        this.iconGraphic.moveTo(0, half);
        this.iconGraphic.lineTo(0, 0);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        this.iconGraphic.moveTo(-half * 0.4, -half * 0.2);
        this.iconGraphic.quadraticCurveTo(-half * 0.8, -half, 0, -half);
        this.iconGraphic.quadraticCurveTo(half * 0.8, -half, half * 0.4, -half * 0.2);
        this.iconGraphic.quadraticCurveTo(0, -half * 0.5, -half * 0.4, -half * 0.2);
        this.iconGraphic.fill({ color, alpha: 0.9 });
        break;

      case "compost":
        this.iconGraphic.roundRect(-half * 0.7, -half * 0.5, half * 1.4, half * 1.5, 2);
        this.iconGraphic.fill({ color, alpha: 0.9 });
        this.iconGraphic.moveTo(-half * 0.5, -half);
        this.iconGraphic.lineTo(half * 0.5, -half);
        this.iconGraphic.stroke({ color, width: 2, alpha: 0.9 });
        break;

      default:
        this.iconGraphic.circle(0, 0, half * 0.8);
        this.iconGraphic.fill({ color, alpha: 0.9 });
    }
  }

  getScoreColor(score: number): number {
    // Garden, compost, and office use their building colors
    if (this.buildingType === "garden") return 0x84cc16; // lime green
    if (this.buildingType === "compost") return 0x78716c; // stone
    if (this.buildingType === "office") return 0x06b6d4; // cyan

    // Audit buildings use score-based colors
    if (score < 3) return 0xef4444;
    if (score < 6) return 0xf59e0b;
    if (score < 8) return 0x3b82f6;
    return 0x22c55e;
  }

  updateScore(score: number): void {
    if (this.currentScore === score) return;

    this.currentScore = score;
    this.scoreLabel.text = this.formatScore(score);
    this.drawBuildingBadge();
    this.startPulse();
  }

  updateFromBuilding(building: Building): void {
    this.updateScore(building.score);
  }

  getBuildingColor(): number {
    const hexColor = BUILDING_COLORS[this.buildingType];
    return parseInt(hexColor.replace("#", ""), 16);
  }
}

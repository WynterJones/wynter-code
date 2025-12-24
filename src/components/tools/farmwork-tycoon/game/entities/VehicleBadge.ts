import { Badge } from "./Badge";
import type { VehicleTaskStatus } from "../../types";
import { getTaskMessage } from "../../types";

export class VehicleBadge extends Badge {
  private currentTask: VehicleTaskStatus = "entering";
  private currentDestination?: string;

  constructor() {
    super({
      text: "Arriving...",
      floating: false,
      minWidth: 120,
      fontSize: 14,
      padding: 10,
      backgroundColor: 0x1a1a2e,
      textColor: 0xffffff,
    });

    this.bobAmplitude = 2;
    this.bobSpeed = 3;
  }

  setTask(task: VehicleTaskStatus, destination?: string): void {
    if (this.currentTask === task && this.currentDestination === destination) {
      return;
    }

    this.currentTask = task;
    this.currentDestination = destination;

    const message = getTaskMessage(task, destination);
    this.setText(message);

    const bgColor = this.getTaskBackgroundColor(task);
    this.setBackgroundColor(bgColor);

    if (task === "delivering" || task === "exiting" || task === "finished") {
      this.startPulse();
    }
  }

  private getTaskBackgroundColor(task: VehicleTaskStatus): number {
    switch (task) {
      case "entering":
      case "traveling_to_pickup":
        return 0x1a1a2e;
      case "loading":
        return 0x1e3a5f;
      case "traveling_to_delivery":
        return 0x1e3a5f;
      case "delivering":
        return 0x1e4620;
      case "exiting":
      case "finished":
        return 0x22c55e;
      default:
        return 0x1a1a2e;
    }
  }

  getTask(): VehicleTaskStatus {
    return this.currentTask;
  }
}

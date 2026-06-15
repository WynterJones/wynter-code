/**
 * FarmworkBridge - Connects Claude Code CLI tool events to Farmwork Tycoon game
 *
 * This service bridges the gap between Claude's tool calls and the visual
 * representation in Farmwork Tycoon. When tools execute, vehicles spawn
 * and animate through the game world.
 */

import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";
import type { BuildingType } from "@/components/tools/farmwork-tycoon/types";

// Tool-to-color mapping for vehicle tinting
const TOOL_TINT_COLORS: Record<string, number> = {
  // File operations
  read: 0x3b82f6,      // Blue
  write: 0xa855f7,     // Purple
  edit: 0xf97316,      // Orange

  // Terminal
  bash: 0xeab308,      // Yellow

  // Search
  grep: 0x06b6d4,      // Cyan
  glob: 0x14b8a6,      // Teal

  // Web
  websearch: 0xec4899, // Pink
  webfetch: 0xf43f5e,  // Rose

  // Task/Subagent (default for Task calls without specific routing)
  task: 0x22c55e,      // Green
};

// Subagent patterns to building mapping
const SUBAGENT_TO_BUILDING: Array<{ pattern: RegExp; building: BuildingType }> = [
  { pattern: /security|tauri-security/i, building: "security" },
  { pattern: /test/i, building: "tests" },
  { pattern: /performance/i, building: "performance" },
  { pattern: /accessibility/i, building: "accessibility" },
  { pattern: /code|smell|reviewer|unused|rust/i, building: "codeQuality" },
  { pattern: /garden|idea/i, building: "garden" },
  { pattern: /farmer|farmhouse/i, building: "farmhouse" },
];

class FarmworkBridge {
  private toolVehicleMap = new Map<string, string>(); // toolId -> vehicleId
  private enabled = true;

  // Hook-driven (Claude Code hooks) path. Once a hook event arrives, hooks
  // become the single source of truth and the stream-parse path (onToolStart/
  // onToolComplete) is suppressed so in-app panels don't double-spawn cards.
  private hooksActive = false;
  // Pending vehicles per `${session}::${tool}`, FIFO — used to correlate a
  // PostToolUse with its PreToolUse, since Claude Code hooks share no tool id.
  private hookVehicleQueues = new Map<string, string[]>();

  /**
   * Enable or disable the bridge
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if the bridge is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Spawn the vehicle + activity for a tool starting. Shared by the stream-parse
   * and hook-driven paths. Returns the spawned vehicleId, or null if the game
   * isn't initialized yet.
   */
  private spawnForTool(toolName: string): string | null {
    const store = useFarmworkTycoonStore.getState();
    if (!store.isInitialized) return null;

    const isSubagent = this.isSubagentTool(toolName);

    if (isSubagent) {
      // Route to specific building based on agent type
      const buildingId = this.getBuildingForSubagent(toolName);
      const vehicleId = store.spawnVehicle({ destination: buildingId });

      store.addActivity({
        type: "subagent_started",
        message: `${this.getAgentLabel(toolName)} started`,
        buildingId,
      });
      return vehicleId;
    }

    // Regular tool: spawn tinted vehicle to Home, with random chance to also visit farmhouse
    const tint = this.getTintForTool(toolName);
    const alsoVisitFarmhouse = Math.random() < 0.3; // 30% chance to also visit farmhouse

    const vehicleId = alsoVisitFarmhouse
      ? store.spawnVehicle({ route: ["office", "farmhouse"], tint })
      : store.spawnVehicle({ route: ["office"], tint });

    // Increment tool count for Home building
    store.incrementToolCount();

    store.addActivity({
      type: "tool_started",
      message: `${this.formatToolName(toolName)}`,
      buildingId: "office",
    });
    return vehicleId;
  }

  /**
   * Signal a vehicle to exit and emit a completion activity. Shared by both paths.
   */
  private completeVehicle(vehicleId: string, isError: boolean): void {
    const store = useFarmworkTycoonStore.getState();
    store.signalVehicleExit(vehicleId);
    store.addActivity({
      type: "tool_completed",
      message: isError ? "Tool failed" : "Tool completed",
    });
  }

  /**
   * Called when a tool starts executing (stream-parse path, in-app panels).
   */
  onToolStart(toolName: string, toolId: string): void {
    if (!this.enabled || this.hooksActive) return;

    const vehicleId = this.spawnForTool(toolName);
    if (vehicleId) this.toolVehicleMap.set(toolId, vehicleId);
  }

  /**
   * Called when a tool finishes executing (stream-parse path, in-app panels).
   */
  onToolComplete(toolId: string, isError: boolean): void {
    if (!this.enabled || this.hooksActive) return;

    const vehicleId = this.toolVehicleMap.get(toolId);
    if (vehicleId) {
      this.completeVehicle(vehicleId, isError);
      this.toolVehicleMap.delete(toolId);
    }
  }

  /**
   * Ingest a tool event delivered by a Claude Code hook (via the file-watched
   * event stream). This is the single source once active: it flips hooksActive
   * so the stream-parse path stops to avoid double cards.
   *
   * Correlation: PreToolUse pushes the spawned vehicle onto a per-(session,tool)
   * FIFO queue; PostToolUse pops the oldest and exits it. Unmatched completions
   * fall back to a generic activity.
   */
  ingestHookEvent(e: { event: string; tool: string; session: string }): void {
    if (!this.enabled) return;
    this.hooksActive = true;

    const key = `${e.session}::${e.tool}`;

    if (e.event === "PreToolUse") {
      const vehicleId = this.spawnForTool(e.tool);
      if (vehicleId) {
        const queue = this.hookVehicleQueues.get(key) ?? [];
        queue.push(vehicleId);
        this.hookVehicleQueues.set(key, queue);
      }
    } else if (e.event === "PostToolUse") {
      const queue = this.hookVehicleQueues.get(key);
      const vehicleId = queue?.shift();
      if (queue && queue.length === 0) this.hookVehicleQueues.delete(key);

      if (vehicleId) {
        this.completeVehicle(vehicleId, false);
      } else {
        const store = useFarmworkTycoonStore.getState();
        if (store.isInitialized) {
          store.addActivity({ type: "tool_completed", message: "Tool completed" });
        }
      }
    }
  }

  /**
   * Check if a tool name indicates a subagent/Task call
   */
  private isSubagentTool(toolName: string): boolean {
    const name = toolName.toLowerCase();
    return (
      name === "task" ||
      name.includes("auditor") ||
      name.includes("agent") ||
      name.includes("gardener") ||
      name.includes("farmer") ||
      name.includes("reviewer") ||
      name.includes("cleaner")
    );
  }

  /**
   * Get the target building for a subagent based on its name
   */
  private getBuildingForSubagent(toolName: string): BuildingType {
    const name = toolName.toLowerCase();

    for (const { pattern, building } of SUBAGENT_TO_BUILDING) {
      if (pattern.test(name)) {
        return building;
      }
    }

    // Default to office for unknown agents
    return "office";
  }

  /**
   * Get the tint color for a tool
   */
  private getTintForTool(toolName: string): number {
    const name = toolName.toLowerCase();

    // Check exact matches first
    for (const [key, color] of Object.entries(TOOL_TINT_COLORS)) {
      if (name.includes(key)) {
        return color;
      }
    }

    // Default: no tint (white)
    return 0xffffff;
  }

  /**
   * Get a human-readable label for a subagent
   */
  private getAgentLabel(toolName: string): string {
    const name = toolName.toLowerCase();

    if (name.includes("security")) return "Security Auditor";
    if (name.includes("performance")) return "Performance Auditor";
    if (name.includes("accessibility")) return "Accessibility Auditor";
    if (name.includes("code") || name.includes("smell")) return "Code Quality Auditor";
    if (name.includes("garden") || name.includes("idea")) return "Idea Gardener";
    if (name.includes("farmer")) return "The Farmer";
    if (name.includes("test")) return "Test Scaffolder";
    if (name.includes("reviewer")) return "Code Reviewer";
    if (name.includes("unused") || name.includes("cleaner")) return "Code Cleaner";
    if (name.includes("rust")) return "Rust Auditor";

    return "Agent";
  }

  /**
   * Format a tool name for display
   */
  private formatToolName(toolName: string): string {
    // Capitalize first letter and add spaces before capitals
    return toolName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Clean up when the bridge is destroyed
   */
  destroy(): void {
    this.toolVehicleMap.clear();
    this.hookVehicleQueues.clear();
  }
}

// Singleton instance
export const farmworkBridge = new FarmworkBridge();

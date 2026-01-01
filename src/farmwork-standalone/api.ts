/**
 * HTTP API client for Farmwork Standalone
 * Replaces Tauri invokes with HTTP calls to the mobile API server
 */

import type { BeadsStats, BeadsIssue } from "@/types/beads";

interface FarmworkStandaloneConfig {
  host: string;
  port: number;
  token: string;
  projectPath: string;
}

interface AuditMetadata {
  score: number;
  open_items: { priority: string; text: string }[];
  last_updated?: string;
  status?: string;
}

interface GardenStats {
  active_ideas: number;
  planted: number;
  growing: number;
  picked: number;
}

interface CompostStats {
  rejected_ideas: number;
}

export interface FarmworkStats {
  audit_scores: {
    security: AuditMetadata;
    tests: AuditMetadata;
    performance: AuditMetadata;
    accessibility: AuditMetadata;
    code_quality: AuditMetadata;
    farmhouse: AuditMetadata;
  };
  garden_stats: GardenStats;
  compost_stats: CompostStats;
  beads_stats: BeadsStats | null;
}

export interface FarmworkActivity {
  events: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
  }>;
}

class FarmworkStandaloneApi {
  private config: FarmworkStandaloneConfig | null = null;

  configure(config: FarmworkStandaloneConfig) {
    this.config = config;
    // Set global for compatibility with existing store
    (window as unknown as { __FARMWORK_PROJECT_PATH__: string }).__FARMWORK_PROJECT_PATH__ = config.projectPath;
  }

  getConfig(): FarmworkStandaloneConfig | null {
    return this.config;
  }

  private getBaseUrl(): string {
    if (!this.config) throw new Error("API not configured");
    return `http://${this.config.host}:${this.config.port}`;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    if (!this.config) throw new Error("API not configured");

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async fetchStats(): Promise<FarmworkStats> {
    if (!this.config) throw new Error("API not configured");
    const encodedPath = encodeURIComponent(this.config.projectPath);
    return this.fetch<FarmworkStats>(`/api/v1/farmwork/stats?project_path=${encodedPath}`);
  }

  async fetchActivity(): Promise<FarmworkActivity> {
    if (!this.config) throw new Error("API not configured");
    const encodedPath = encodeURIComponent(this.config.projectPath);
    return this.fetch<FarmworkActivity>(`/api/v1/farmwork/activity?project_path=${encodedPath}`);
  }

  async fetchBeadsIssues(): Promise<BeadsIssue[]> {
    if (!this.config) throw new Error("API not configured");
    const encodedPath = encodeURIComponent(this.config.projectPath);
    return this.fetch<BeadsIssue[]>(`/api/v1/projects/current/beads?project_path=${encodedPath}`);
  }

  async fetchBeadsStats(): Promise<BeadsStats> {
    if (!this.config) throw new Error("API not configured");
    const encodedPath = encodeURIComponent(this.config.projectPath);
    return this.fetch<BeadsStats>(`/api/v1/projects/current/beads/stats?project_path=${encodedPath}`);
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage: (data: unknown) => void): WebSocket {
    if (!this.config) throw new Error("API not configured");

    const ws = new WebSocket(
      `ws://${this.config.host}:${this.config.port}/api/v1/ws?token=${this.config.token}`
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    return ws;
  }
}

export const farmworkApi = new FarmworkStandaloneApi();

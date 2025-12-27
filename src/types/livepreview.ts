export type ProjectType =
  | "vite"
  | "next"
  | "nuxt"
  | "reactcra"
  | "vuecli"
  | "angular"
  | "remix"
  | "astro"
  | "svelte"
  | "static"
  | "unknown";

export type PreviewStatus =
  | "idle"
  | "detecting"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface ProjectDetectionResult {
  projectType: ProjectType;
  hasDevScript: boolean;
  devCommand: string | null;
  packageManager: PackageManager;
  suggestedPort: number;
  hasIndexHtml: boolean;
  frameworkName: string;
}

export interface PreviewServerInfo {
  serverId: string;
  projectPath: string;
  projectType: ProjectType;
  port: number;
  url: string;
  localUrl: string | null;
  status: PreviewStatus;
  error: string | null;
  startedAt: number;
  isFrameworkServer: boolean;
}

export interface PreviewEvent {
  serverId: string;
  eventType: "status_change" | "ready" | "output" | "stopped" | "error";
  url?: string;
  status?: PreviewStatus;
  message?: string;
}

export interface PortCheckResult {
  port: number;
  inUse: boolean;
  nextAvailable: number;
}

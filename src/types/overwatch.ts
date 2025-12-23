// Service provider types
export type ServiceProvider = "railway" | "plausible" | "netlify" | "sentry";

// Connection mode: link-only (just external link) or api (full integration)
export type ConnectionMode = "link" | "api";

// Service status
export type ServiceStatus = "healthy" | "degraded" | "down" | "unknown" | "loading";

// Base service configuration
export interface ServiceConfig {
  id: string;
  workspaceId: string;
  provider: ServiceProvider;
  name: string;
  connectionMode: ConnectionMode;
  externalUrl?: string;
  apiKeyId?: string;
  // Provider-specific identifiers
  projectId?: string;
  siteId?: string;
  organizationSlug?: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface ServiceConfigInput {
  workspaceId: string;
  provider: ServiceProvider;
  name: string;
  connectionMode: ConnectionMode;
  externalUrl?: string;
  apiKeyId?: string;
  projectId?: string;
  siteId?: string;
  organizationSlug?: string;
  enabled?: boolean;
  sortOrder?: number;
}

// Provider-specific metrics
export interface RailwayMetrics {
  deploymentStatus: "building" | "deploying" | "active" | "failed" | "removed" | "sleeping";
  lastDeployedAt: number | null;
  serviceCount: number;
  environmentName?: string;
}

export interface PlausibleMetrics {
  visitors: number;
  pageviews: number;
  bounceRate: number;
  visitDuration: number;
  period: "realtime" | "day" | "7d" | "30d";
}

export interface NetlifyMetrics {
  buildStatus: "ready" | "building" | "failed" | "enqueued" | "canceled";
  lastPublishedAt: number | null;
  deployTime: number | null;
  siteUrl: string;
  siteName: string;
}

export interface SentryMetrics {
  unresolvedIssues: number;
  issuesLast24h: number;
  crashFreeRate: number;
  eventsLast24h: number;
}

// Union type for all metrics
export type ServiceMetrics = RailwayMetrics | PlausibleMetrics | NetlifyMetrics | SentryMetrics;

// Generic service data with status
export interface ServiceData {
  configId: string;
  status: ServiceStatus;
  lastUpdated: number;
  error?: string;
  metrics?: ServiceMetrics;
}

// API responses from Tauri
export interface OverwatchApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Provider metadata for UI
export interface ProviderInfo {
  id: ServiceProvider;
  name: string;
  icon: string;
  color: string;
  apiDocsUrl: string;
  requiredFields: string[];
}

export const PROVIDER_INFO: Record<ServiceProvider, ProviderInfo> = {
  railway: {
    id: "railway",
    name: "Railway",
    icon: "Train",
    color: "#9B4DFF",
    apiDocsUrl: "https://docs.railway.app/reference/public-api",
    requiredFields: ["projectId"],
  },
  plausible: {
    id: "plausible",
    name: "Plausible",
    icon: "BarChart3",
    color: "#5850EC",
    apiDocsUrl: "https://plausible.io/docs/stats-api",
    requiredFields: ["siteId"],
  },
  netlify: {
    id: "netlify",
    name: "Netlify",
    icon: "Globe",
    color: "#00C7B7",
    apiDocsUrl: "https://docs.netlify.com/api/get-started/",
    requiredFields: ["siteId"],
  },
  sentry: {
    id: "sentry",
    name: "Sentry",
    icon: "Bug",
    color: "#362D59",
    apiDocsUrl: "https://docs.sentry.io/api/",
    requiredFields: ["organizationSlug", "projectId"],
  },
};

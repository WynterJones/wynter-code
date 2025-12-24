import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import type {
  ServiceConfig,
  ServiceConfigInput,
  ServiceData,
  ServiceProvider,
  ServiceStatus,
  RailwayMetrics,
  PlausibleMetrics,
  NetlifyMetrics,
  SentryMetrics,
} from "@/types/overwatch";
import { useEnvStore } from "./envStore";

interface OverwatchStore {
  // Persisted service configurations
  services: ServiceConfig[];

  // Runtime state (not persisted)
  serviceData: Map<string, ServiceData>;
  refreshing: Set<string>;
  autoRefreshEnabled: boolean;
  refreshInterval: number;

  // Configuration CRUD
  addService: (input: ServiceConfigInput) => string;
  updateService: (id: string, updates: Partial<ServiceConfigInput>) => void;
  deleteService: (id: string) => void;
  reorderServices: (workspaceId: string, serviceIds: string[]) => void;

  // Workspace-scoped queries
  getServicesForWorkspace: (workspaceId: string) => ServiceConfig[];
  getServicesByProvider: (workspaceId: string, provider: ServiceProvider) => ServiceConfig[];
  getService: (id: string) => ServiceConfig | undefined;

  // Data fetching
  refreshService: (serviceId: string) => Promise<void>;
  refreshAllServices: (workspaceId: string) => Promise<void>;
  getServiceData: (serviceId: string) => ServiceData | undefined;
  setServiceData: (serviceId: string, data: Partial<ServiceData>) => void;

  // Settings
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (seconds: number) => void;

  // Helpers
  getApiKeyValue: (apiKeyId: string) => string | undefined;

  // Reset
  reset: () => void;
}

export const useOverwatchStore = create<OverwatchStore>()(
  persist(
    (set, get) => ({
      services: [],
      serviceData: new Map(),
      refreshing: new Set(),
      autoRefreshEnabled: true,
      refreshInterval: 60,

      addService: (input) => {
        const now = Date.now();
        const workspaceServices = get().services.filter(
          (s) => s.workspaceId === input.workspaceId
        );

        const service: ServiceConfig = {
          id: uuid(),
          workspaceId: input.workspaceId,
          provider: input.provider,
          name: input.name,
          connectionMode: input.connectionMode,
          externalUrl: input.externalUrl,
          apiKeyId: input.apiKeyId,
          projectId: input.projectId,
          siteId: input.siteId,
          organizationSlug: input.organizationSlug,
          enabled: input.enabled ?? true,
          sortOrder: input.sortOrder ?? workspaceServices.length,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          services: [...state.services, service],
        }));

        return service.id;
      },

      updateService: (id, updates) => {
        set((state) => ({
          services: state.services.map((service) =>
            service.id === id
              ? {
                  ...service,
                  ...updates,
                  updatedAt: Date.now(),
                }
              : service
          ),
        }));
      },

      deleteService: (id) => {
        set((state) => {
          const newServiceData = new Map(state.serviceData);
          newServiceData.delete(id);
          return {
            services: state.services.filter((s) => s.id !== id),
            serviceData: newServiceData,
          };
        });
      },

      reorderServices: (workspaceId, serviceIds) => {
        set((state) => ({
          services: state.services.map((service) => {
            if (service.workspaceId !== workspaceId) return service;
            const newIndex = serviceIds.indexOf(service.id);
            if (newIndex === -1) return service;
            return { ...service, sortOrder: newIndex, updatedAt: Date.now() };
          }),
        }));
      },

      getServicesForWorkspace: (workspaceId) => {
        return get()
          .services.filter((s) => s.workspaceId === workspaceId)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getServicesByProvider: (workspaceId, provider) => {
        return get()
          .services.filter(
            (s) => s.workspaceId === workspaceId && s.provider === provider
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);
      },

      getService: (id) => {
        return get().services.find((s) => s.id === id);
      },

      getServiceData: (serviceId) => {
        return get().serviceData.get(serviceId);
      },

      setServiceData: (serviceId, data) => {
        set((state) => {
          const newServiceData = new Map(state.serviceData);
          const existing = newServiceData.get(serviceId);
          newServiceData.set(serviceId, {
            configId: serviceId,
            status: "unknown" as ServiceStatus,
            lastUpdated: Date.now(),
            ...existing,
            ...data,
          });
          return { serviceData: newServiceData };
        });
      },

      refreshService: async (serviceId) => {
        const service = get().getService(serviceId);
        if (!service || service.connectionMode === "link") return;

        // Set loading state
        set((state) => {
          const newRefreshing = new Set(state.refreshing);
          newRefreshing.add(serviceId);
          return { refreshing: newRefreshing };
        });

        get().setServiceData(serviceId, { status: "loading" });

        try {
          // Get API key value
          const apiKey = service.apiKeyId
            ? get().getApiKeyValue(service.apiKeyId)
            : undefined;

          if (!apiKey && service.connectionMode === "api") {
            get().setServiceData(serviceId, {
              status: "unknown",
              error: "API key not configured",
            });
            return;
          }

          let metrics: RailwayMetrics | PlausibleMetrics | NetlifyMetrics | SentryMetrics | undefined;
          let status: ServiceStatus = "healthy";

          switch (service.provider) {
            case "railway":
              const railwayResult = await invoke<{
                success: boolean;
                data?: RailwayMetrics;
                error?: string;
              }>("overwatch_railway_status", {
                apiKey,
                projectId: service.projectId,
              });
              if (railwayResult.success && railwayResult.data) {
                metrics = railwayResult.data;
                status =
                  railwayResult.data.deploymentStatus === "failed"
                    ? "down"
                    : railwayResult.data.deploymentStatus === "building" ||
                      railwayResult.data.deploymentStatus === "deploying"
                    ? "degraded"
                    : "healthy";
              } else {
                throw new Error(railwayResult.error || "Failed to fetch Railway status");
              }
              break;

            case "plausible":
              const plausibleResult = await invoke<{
                success: boolean;
                data?: PlausibleMetrics;
                error?: string;
              }>("overwatch_plausible_stats", {
                apiKey,
                siteId: service.siteId,
                period: "day",
              });
              if (plausibleResult.success && plausibleResult.data) {
                metrics = plausibleResult.data;
                status = "healthy";
              } else {
                throw new Error(plausibleResult.error || "Failed to fetch Plausible stats");
              }
              break;

            case "netlify":
              const netlifyResult = await invoke<{
                success: boolean;
                data?: NetlifyMetrics;
                error?: string;
              }>("overwatch_netlify_status", {
                apiKey,
                siteId: service.siteId,
              });
              if (netlifyResult.success && netlifyResult.data) {
                metrics = netlifyResult.data;
                status =
                  netlifyResult.data.buildStatus === "failed"
                    ? "down"
                    : netlifyResult.data.buildStatus === "building" ||
                      netlifyResult.data.buildStatus === "enqueued"
                    ? "degraded"
                    : "healthy";
              } else {
                throw new Error(netlifyResult.error || "Failed to fetch Netlify status");
              }
              break;

            case "sentry":
              const sentryResult = await invoke<{
                success: boolean;
                data?: SentryMetrics;
                error?: string;
              }>("overwatch_sentry_stats", {
                apiKey,
                organizationSlug: service.organizationSlug,
                projectSlug: service.projectId,
              });
              if (sentryResult.success && sentryResult.data) {
                metrics = sentryResult.data;
                status =
                  sentryResult.data.crashFreeRate < 95
                    ? "degraded"
                    : sentryResult.data.unresolvedIssues > 50
                    ? "degraded"
                    : "healthy";
              } else {
                throw new Error(sentryResult.error || "Failed to fetch Sentry stats");
              }
              break;
          }

          get().setServiceData(serviceId, {
            status,
            metrics,
            error: undefined,
            lastUpdated: Date.now(),
          });
        } catch (error) {
          get().setServiceData(serviceId, {
            status: "down",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          set((state) => {
            const newRefreshing = new Set(state.refreshing);
            newRefreshing.delete(serviceId);
            return { refreshing: newRefreshing };
          });
        }
      },

      refreshAllServices: async (workspaceId) => {
        const services = get().getServicesForWorkspace(workspaceId);
        const apiServices = services.filter((s) => s.connectionMode === "api" && s.enabled);
        await Promise.all(apiServices.map((s) => get().refreshService(s.id)));
      },

      setAutoRefresh: (enabled) => {
        set({ autoRefreshEnabled: enabled });
      },

      setRefreshInterval: (seconds) => {
        set({ refreshInterval: Math.max(30, Math.min(300, seconds)) });
      },

      getApiKeyValue: (apiKeyId) => {
        const envStore = useEnvStore.getState();
        const variable = envStore.globalVariables.find((v) => v.id === apiKeyId);
        return variable?.value;
      },

      reset: () => {
        set({
          services: [],
          serviceData: new Map(),
          refreshing: new Set(),
          autoRefreshEnabled: true,
          refreshInterval: 60,
        });
      },
    }),
    {
      name: "wynter-code-overwatch",
      partialize: (state) => ({
        services: state.services,
        autoRefreshEnabled: state.autoRefreshEnabled,
        refreshInterval: state.refreshInterval,
      }),
    }
  )
);

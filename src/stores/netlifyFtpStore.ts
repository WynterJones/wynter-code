import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  NetlifySite,
  NetlifyDeploy,
  ConnectionStatus,
  DeployConfig,
} from "@/types/netlifyFtp";

interface NetlifyFtpStore {
  // Auth
  apiToken: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;

  // Sites
  sites: NetlifySite[];
  currentSiteId: string | null;
  isLoadingSites: boolean;

  // Deploys
  deploys: Record<string, NetlifyDeploy[]>;
  isLoadingDeploys: boolean;
  pollingIntervalId: ReturnType<typeof setInterval> | null;

  // Upload
  isDeploying: boolean;
  deployProgress: number;
  deployMessage: string;

  // Actions - Auth
  setApiToken: (token: string | null) => void;
  testConnection: () => Promise<boolean>;
  disconnect: () => void;

  // Actions - Sites
  fetchSites: () => Promise<void>;
  selectSite: (siteId: string | null) => void;
  createSite: (name: string) => Promise<NetlifySite | null>;
  deleteSite: (siteId: string) => Promise<boolean>;

  // Actions - Deploys
  fetchDeploys: (siteId: string, skipLoadingState?: boolean) => Promise<void>;
  deployZip: (config: DeployConfig) => Promise<NetlifyDeploy | null>;
  rollbackDeploy: (siteId: string, deployId: string) => Promise<boolean>;
  startDeployPolling: (siteId: string) => void;
  stopDeployPolling: () => void;

  // Actions - UI
  setDeployProgress: (progress: number, message: string) => void;
  clearError: () => void;
}

export const useNetlifyFtpStore = create<NetlifyFtpStore>()(
  persist(
    (set, get) => ({
      // Initial state
      apiToken: null,
      connectionStatus: "disconnected",
      connectionError: null,
      sites: [],
      currentSiteId: null,
      isLoadingSites: false,
      deploys: {},
      isLoadingDeploys: false,
      pollingIntervalId: null,
      isDeploying: false,
      deployProgress: 0,
      deployMessage: "",

      // Auth actions
      setApiToken: (token) => {
        set({
          apiToken: token,
          connectionStatus: token ? "disconnected" : "disconnected",
          connectionError: null,
        });
      },

      testConnection: async () => {
        const { apiToken } = get();
        if (!apiToken) {
          set({ connectionStatus: "error", connectionError: "No API token configured" });
          return false;
        }

        set({ connectionStatus: "connecting", connectionError: null });

        try {
          await invoke("netlify_test_connection", { token: apiToken });
          set({ connectionStatus: "connected", connectionError: null });
          // Auto-fetch sites on successful connection
          get().fetchSites();
          return true;
        } catch (error) {
          set({
            connectionStatus: "error",
            connectionError: error instanceof Error ? error.message : String(error)
          });
          return false;
        }
      },

      disconnect: () => {
        // Stop any polling
        const { pollingIntervalId } = get();
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }
        set({
          connectionStatus: "disconnected",
          connectionError: null,
          sites: [],
          currentSiteId: null,
          deploys: {},
          pollingIntervalId: null,
        });
      },

      // Sites actions
      fetchSites: async () => {
        const { apiToken } = get();
        if (!apiToken) return;

        set({ isLoadingSites: true });

        try {
          const sites = await invoke<NetlifySite[]>("netlify_fetch_sites", { token: apiToken });
          set({ sites, isLoadingSites: false });
        } catch {
          set({ isLoadingSites: false });
        }
      },

      selectSite: (siteId) => {
        // Stop polling for previous site
        get().stopDeployPolling();
        set({ currentSiteId: siteId });
        if (siteId) {
          get().fetchDeploys(siteId).then(() => {
            // Check if there are processing deploys and start polling
            const deploys = get().deploys[siteId] || [];
            const hasProcessing = deploys.some(
              (d) => d.state === "building" || d.state === "processing" || d.state === "uploading"
            );
            if (hasProcessing) {
              get().startDeployPolling(siteId);
            }
          });
        }
      },

      createSite: async (name) => {
        const { apiToken } = get();
        if (!apiToken) return null;

        try {
          const site = await invoke<NetlifySite>("netlify_create_site", { token: apiToken, name });
          set(state => ({ sites: [...state.sites, site] }));
          return site;
        } catch {
          // Handle error
        }
        return null;
      },

      deleteSite: async (siteId) => {
        const { apiToken } = get();
        if (!apiToken) return false;

        try {
          await invoke("netlify_delete_site", { token: apiToken, siteId });
          set(state => ({
            sites: state.sites.filter(s => s.id !== siteId),
            currentSiteId: state.currentSiteId === siteId ? null : state.currentSiteId,
          }));
          return true;
        } catch {
          // Handle error
        }
        return false;
      },

      // Deploys actions
      fetchDeploys: async (siteId, skipLoadingState = false) => {
        const { apiToken, deploys: currentDeploys } = get();
        if (!apiToken) return;

        if (!skipLoadingState) {
          set({ isLoadingDeploys: true });
        }

        try {
          const newDeploys = await invoke<NetlifyDeploy[]>("netlify_fetch_deploys", {
            token: apiToken,
            siteId
          });

          // Only update if deploys have changed
          const existingDeploys = currentDeploys[siteId] || [];
          const hasChanged =
            newDeploys.length !== existingDeploys.length ||
            newDeploys.some((deploy, i) => {
              const existing = existingDeploys[i];
              return !existing ||
                deploy.id !== existing.id ||
                deploy.state !== existing.state ||
                deploy.updated_at !== existing.updated_at;
            });

          if (hasChanged) {
            set(state => ({
              deploys: { ...state.deploys, [siteId]: newDeploys },
              isLoadingDeploys: false,
            }));
          } else if (!skipLoadingState) {
            set({ isLoadingDeploys: false });
          }
        } catch {
          set({ isLoadingDeploys: false });
        }
      },

      deployZip: async (config) => {
        const { apiToken } = get();
        if (!apiToken) return null;

        set({
          isDeploying: true,
          deployProgress: 0,
          deployMessage: "Preparing upload..."
        });

        try {
          // Read the ZIP file as array buffer
          set({ deployProgress: 10, deployMessage: "Reading file..." });
          const arrayBuffer = await config.file.arrayBuffer();
          const zipData = Array.from(new Uint8Array(arrayBuffer));

          set({ deployProgress: 30, deployMessage: "Connecting to Netlify..." });

          set({ deployProgress: 50, deployMessage: "Uploading files..." });

          const deploy = await invoke<NetlifyDeploy>("netlify_deploy_zip", {
            token: apiToken,
            siteId: config.siteId,
            zipData,
          });

          set({ deployProgress: 100, deployMessage: "Deploy complete!" });

          // Refresh deploys list
          await get().fetchDeploys(config.siteId);

          // Start polling for live deploy status updates
          get().startDeployPolling(config.siteId);

          // Reset after a delay
          setTimeout(() => {
            set({ isDeploying: false, deployProgress: 0, deployMessage: "" });
          }, 2000);

          return deploy;
        } catch (error) {
          set({
            isDeploying: false,
            deployProgress: 0,
            deployMessage: "",
            connectionError: `Deploy error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
        return null;
      },

      rollbackDeploy: async (siteId, deployId) => {
        const { apiToken } = get();
        if (!apiToken) return false;

        try {
          await invoke("netlify_rollback_deploy", {
            token: apiToken,
            siteId,
            deployId
          });
          await get().fetchDeploys(siteId);
          await get().fetchSites();
          return true;
        } catch {
          // Handle error
        }
        return false;
      },

      startDeployPolling: (siteId: string) => {
        // Stop any existing polling first
        const { pollingIntervalId } = get();
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
        }

        // Poll every 2 seconds for deploy status updates
        const intervalId = setInterval(async () => {
          const { deploys, apiToken, currentSiteId } = get();

          // Stop polling if we switched sites or disconnected
          if (!apiToken || currentSiteId !== siteId) {
            get().stopDeployPolling();
            return;
          }

          const siteDeploys = deploys[siteId] || [];
          const hasProcessingDeploys = siteDeploys.some(
            (d) => d.state === "building" || d.state === "processing" || d.state === "uploading"
          );

          // Fetch latest deploy status (skip loading state for background polling)
          await get().fetchDeploys(siteId, true);

          // Check if we should stop polling (no more processing deploys)
          const updatedDeploys = get().deploys[siteId] || [];
          const stillProcessing = updatedDeploys.some(
            (d) => d.state === "building" || d.state === "processing" || d.state === "uploading"
          );

          if (!stillProcessing && !hasProcessingDeploys) {
            // No processing deploys, stop polling after one final update
            get().stopDeployPolling();
          }
        }, 2000);

        set({ pollingIntervalId: intervalId });
      },

      stopDeployPolling: () => {
        const { pollingIntervalId } = get();
        if (pollingIntervalId) {
          clearInterval(pollingIntervalId);
          set({ pollingIntervalId: null });
        }
      },

      // UI actions
      setDeployProgress: (progress, message) => {
        set({ deployProgress: progress, deployMessage: message });
      },

      clearError: () => {
        set({ connectionError: null });
      },
    }),
    {
      name: "netlify-ftp-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiToken: state.apiToken,
      }),
    }
  )
);

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { 
  NetlifySite, 
  NetlifyDeploy, 
  ConnectionStatus,
  DeployConfig,
} from "@/types/netlifyFtp";

const NETLIFY_API_BASE = "https://api.netlify.com/api/v1";

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
  fetchDeploys: (siteId: string) => Promise<void>;
  deployZip: (config: DeployConfig) => Promise<NetlifyDeploy | null>;
  rollbackDeploy: (siteId: string, deployId: string) => Promise<boolean>;
  
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
          const response = await fetch(`${NETLIFY_API_BASE}/user`, {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (response.ok) {
            set({ connectionStatus: "connected", connectionError: null });
            // Auto-fetch sites on successful connection
            get().fetchSites();
            return true;
          } else {
            const error = await response.text();
            set({ 
              connectionStatus: "error", 
              connectionError: `Auth failed: ${response.status} - ${error}` 
            });
            return false;
          }
        } catch (error) {
          set({ 
            connectionStatus: "error", 
            connectionError: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}` 
          });
          return false;
        }
      },

      disconnect: () => {
        set({
          connectionStatus: "disconnected",
          connectionError: null,
          sites: [],
          currentSiteId: null,
          deploys: {},
        });
      },

      // Sites actions
      fetchSites: async () => {
        const { apiToken } = get();
        if (!apiToken) return;

        set({ isLoadingSites: true });

        try {
          const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (response.ok) {
            const sites = await response.json();
            set({ sites, isLoadingSites: false });
          } else {
            set({ isLoadingSites: false });
          }
        } catch {
          set({ isLoadingSites: false });
        }
      },

      selectSite: (siteId) => {
        set({ currentSiteId: siteId });
        if (siteId) {
          get().fetchDeploys(siteId);
        }
      },

      createSite: async (name) => {
        const { apiToken } = get();
        if (!apiToken) return null;

        try {
          const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
          });

          if (response.ok) {
            const site = await response.json();
            set(state => ({ sites: [...state.sites, site] }));
            return site;
          }
        } catch {
          // Handle error
        }
        return null;
      },

      deleteSite: async (siteId) => {
        const { apiToken } = get();
        if (!apiToken) return false;

        try {
          const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (response.ok) {
            set(state => ({
              sites: state.sites.filter(s => s.id !== siteId),
              currentSiteId: state.currentSiteId === siteId ? null : state.currentSiteId,
            }));
            return true;
          }
        } catch {
          // Handle error
        }
        return false;
      },

      // Deploys actions
      fetchDeploys: async (siteId) => {
        const { apiToken } = get();
        if (!apiToken) return;

        set({ isLoadingDeploys: true });

        try {
          const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
            headers: {
              Authorization: `Bearer ${apiToken}`,
            },
          });

          if (response.ok) {
            const deploys = await response.json();
            set(state => ({
              deploys: { ...state.deploys, [siteId]: deploys },
              isLoadingDeploys: false,
            }));
          } else {
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
          
          set({ deployProgress: 30, deployMessage: "Connecting to Netlify..." });
          
          // Deploy the ZIP
          const deployUrl = `${NETLIFY_API_BASE}/sites/${config.siteId}/deploys`;
          
          set({ deployProgress: 50, deployMessage: "Uploading files..." });
          
          const response = await fetch(deployUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/zip",
            },
            body: arrayBuffer,
          });

          set({ deployProgress: 80, deployMessage: "Processing deploy..." });

          if (response.ok) {
            const deploy = await response.json();
            
            set({ deployProgress: 100, deployMessage: "Deploy complete!" });
            
            // Refresh deploys list
            await get().fetchDeploys(config.siteId);
            
            // Reset after a delay
            setTimeout(() => {
              set({ isDeploying: false, deployProgress: 0, deployMessage: "" });
            }, 2000);
            
            return deploy;
          } else {
            const error = await response.text();
            set({ 
              isDeploying: false, 
              deployProgress: 0, 
              deployMessage: "",
              connectionError: `Deploy failed: ${error}`,
            });
          }
        } catch (error) {
          set({ 
            isDeploying: false, 
            deployProgress: 0, 
            deployMessage: "",
            connectionError: `Deploy error: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
        return null;
      },

      rollbackDeploy: async (siteId, deployId) => {
        const { apiToken } = get();
        if (!apiToken) return false;

        try {
          const response = await fetch(
            `${NETLIFY_API_BASE}/sites/${siteId}/deploys/${deployId}/restore`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiToken}`,
              },
            }
          );

          if (response.ok) {
            await get().fetchDeploys(siteId);
            await get().fetchSites();
            return true;
          }
        } catch {
          // Handle error
        }
        return false;
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

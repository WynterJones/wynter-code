/**
 * Web Backup Store - Encrypted cloud backup via Netlify
 * Uses Tauri backend to proxy Netlify API calls (avoids CORS)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  WebBackupStore,
  BackupSite,
  BackupInterval,
  BackupConnectionStatus,
} from "@/types/webBackup";

export const useWebBackupStore = create<WebBackupStore>()(
  persist(
    (set, get) => ({
      // Configuration (persisted)
      enabled: false,
      netlifyToken: null,
      siteId: null,
      siteName: null,
      siteUrl: null,
      lastBackupAt: null,
      lastBackupHash: null,
      autoBackupInterval: 24 as BackupInterval,
      backupOnClose: true,

      // Runtime state (not persisted)
      connectionStatus: "disconnected" as BackupConnectionStatus,
      connectionError: null,
      isBackingUp: false,
      backupProgress: 0,
      backupMessage: "",
      backupError: null,
      availableSites: [],
      isLoadingSites: false,

      // Configuration actions
      setEnabled: (enabled) => set({ enabled }),

      setNetlifyToken: (token) => {
        set({
          netlifyToken: token,
          connectionStatus: "disconnected",
          connectionError: null,
        });
      },

      setAutoBackupInterval: (interval) => set({ autoBackupInterval: interval }),

      setBackupOnClose: (enabled) => set({ backupOnClose: enabled }),

      // Connection actions (via Tauri to avoid CORS)
      testConnection: async () => {
        const { netlifyToken } = get();
        if (!netlifyToken) {
          set({
            connectionStatus: "error",
            connectionError: "No API token configured",
          });
          return false;
        }

        set({ connectionStatus: "connecting", connectionError: null });

        try {
          await invoke("netlify_test_connection", { token: netlifyToken });
          set({ connectionStatus: "connected", connectionError: null });
          get().fetchSites();
          return true;
        } catch (error) {
          set({
            connectionStatus: "error",
            connectionError: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      },

      disconnect: () => {
        set({
          connectionStatus: "disconnected",
          connectionError: null,
          availableSites: [],
        });
      },

      // Sites actions (via Tauri to avoid CORS)
      fetchSites: async () => {
        const { netlifyToken } = get();
        if (!netlifyToken) return;

        set({ isLoadingSites: true });

        try {
          const sites = await invoke<BackupSite[]>("netlify_fetch_sites", {
            token: netlifyToken,
          });
          set({ availableSites: sites, isLoadingSites: false });
        } catch {
          set({ isLoadingSites: false });
        }
      },

      createBackupSite: async (siteName) => {
        const { netlifyToken } = get();
        if (!netlifyToken) return null;

        try {
          const site = await invoke<BackupSite>("netlify_create_site", {
            token: netlifyToken,
            name: siteName,
          });

          set((state) => ({
            availableSites: [...state.availableSites, site],
            siteId: site.id,
            siteName: site.name,
            siteUrl: site.ssl_url || site.url,
          }));
          return site;
        } catch (error) {
          set({
            backupError: `Failed to create site: ${error instanceof Error ? error.message : String(error)}`,
          });
          return null;
        }
      },

      selectSite: async (siteId) => {
        const { availableSites } = get();
        const site = availableSites.find((s) => s.id === siteId);
        if (site) {
          set({
            siteId: site.id,
            siteName: site.name,
            siteUrl: site.ssl_url || site.url,
          });
        }
      },

      // Backup operations
      performBackup: async (password) => {
        const { netlifyToken, siteId, enabled } = get();

        if (!enabled || !netlifyToken || !siteId) {
          set({ backupError: "Backup not configured" });
          return false;
        }

        set({
          isBackingUp: true,
          backupProgress: 0,
          backupMessage: "Collecting data...",
          backupError: null,
        });

        try {
          // Import orchestrator dynamically to avoid circular deps
          const { performBackup: doBackup } = await import(
            "@/services/backupOrchestrator"
          );
          const success = await doBackup(password);

          if (success) {
            set({
              lastBackupAt: Date.now(),
              isBackingUp: false,
              backupProgress: 100,
              backupMessage: "Backup complete!",
            });

            // Reset progress after delay
            setTimeout(() => {
              set({ backupProgress: 0, backupMessage: "" });
            }, 3000);

            return true;
          } else {
            set({
              isBackingUp: false,
              backupProgress: 0,
              backupMessage: "",
            });
            return false;
          }
        } catch (error) {
          set({
            isBackingUp: false,
            backupProgress: 0,
            backupMessage: "",
            backupError:
              error instanceof Error ? error.message : "Backup failed",
          });
          return false;
        }
      },

      setProgress: (progress, message) => {
        set({ backupProgress: progress, backupMessage: message });
      },

      // Recovery
      importFromUrl: async (url, password) => {
        set({
          isBackingUp: true,
          backupProgress: 0,
          backupMessage: "Fetching backup...",
          backupError: null,
        });

        try {
          const { importFromUrl: doImport } = await import(
            "@/services/backupOrchestrator"
          );
          const success = await doImport(url, password);

          set({
            isBackingUp: false,
            backupProgress: success ? 100 : 0,
            backupMessage: success ? "Import complete!" : "",
          });

          if (success) {
            setTimeout(() => {
              set({ backupProgress: 0, backupMessage: "" });
            }, 3000);
          }

          return success;
        } catch (error) {
          set({
            isBackingUp: false,
            backupProgress: 0,
            backupMessage: "",
            backupError:
              error instanceof Error ? error.message : "Import failed",
          });
          return false;
        }
      },

      // Utilities
      clearError: () => set({ backupError: null, connectionError: null }),

      reset: () => {
        set({
          enabled: false,
          netlifyToken: null,
          siteId: null,
          siteName: null,
          siteUrl: null,
          lastBackupAt: null,
          lastBackupHash: null,
          autoBackupInterval: 24,
          backupOnClose: true,
          connectionStatus: "disconnected",
          connectionError: null,
          isBackingUp: false,
          backupProgress: 0,
          backupMessage: "",
          backupError: null,
          availableSites: [],
          isLoadingSites: false,
        });
      },

      needsBackup: () => {
        const { enabled, autoBackupInterval, lastBackupAt } = get();
        if (!enabled || autoBackupInterval === 0) return false;

        const now = Date.now();
        const intervalMs = autoBackupInterval * 60 * 60 * 1000;

        return !lastBackupAt || now - lastBackupAt >= intervalMs;
      },
    }),
    {
      name: "wynter-code-web-backup",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        netlifyToken: state.netlifyToken,
        siteId: state.siteId,
        siteName: state.siteName,
        siteUrl: state.siteUrl,
        lastBackupAt: state.lastBackupAt,
        lastBackupHash: state.lastBackupHash,
        autoBackupInterval: state.autoBackupInterval,
        backupOnClose: state.backupOnClose,
      }),
    }
  )
);

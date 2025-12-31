import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { handleError } from "@/lib/errorHandler";
import type {
  CleanableItem,
  ScanResult,
  InstalledApp,
  DeleteResult,
  CleanerCategory,
  LargeFileThreshold,
} from "@/types/systemCleaner";

interface SystemCleanerStore {
  // Scan results
  largeFiles: CleanableItem[];
  appCaches: CleanableItem[];
  installedApps: InstalledApp[];

  // Totals
  largeFilesTotalSize: number;
  appCachesTotalSize: number;
  installedAppsTotalSize: number;

  // Selection state
  selectedItems: Set<string>;

  // UI state
  activeCategory: CleanerCategory;
  isScanning: boolean;
  isDeleting: boolean;
  error: string | null;

  // Settings
  largeFileThreshold: LargeFileThreshold;

  // Last scan times
  lastScanTime: Record<CleanerCategory, number | null>;

  // Actions - Navigation
  setActiveCategory: (category: CleanerCategory) => void;
  setLargeFileThreshold: (threshold: LargeFileThreshold) => void;

  // Actions - Selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  getSelectedSize: () => number;

  // Actions - Scanning
  scanLargeFiles: () => Promise<void>;
  scanAppCaches: () => Promise<void>;
  scanInstalledApps: () => Promise<void>;
  scanCurrentCategory: () => Promise<void>;

  // Actions - Deletion
  deleteSelected: () => Promise<DeleteResult | null>;
  uninstallApp: (path: string) => Promise<DeleteResult | null>;

  // Actions - Utility
  clearError: () => void;
  reset: () => void;
}

export const useSystemCleanerStore = create<SystemCleanerStore>((set, get) => ({
  // Initial state
  largeFiles: [],
  appCaches: [],
  installedApps: [],
  largeFilesTotalSize: 0,
  appCachesTotalSize: 0,
  installedAppsTotalSize: 0,
  selectedItems: new Set(),
  activeCategory: "large-files",
  isScanning: false,
  isDeleting: false,
  error: null,
  largeFileThreshold: 100,
  lastScanTime: {
    "large-files": null,
    "app-caches": null,
    "installed-apps": null,
  },

  // Navigation
  setActiveCategory: (category: CleanerCategory) => {
    set({ activeCategory: category, selectedItems: new Set() });
  },

  setLargeFileThreshold: (threshold: LargeFileThreshold) => {
    set({ largeFileThreshold: threshold });
  },

  // Selection
  toggleSelection: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedItems);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedItems: next };
    });
  },

  selectAll: () => {
    const state = get();
    let items: { id?: string; path?: string }[] = [];

    switch (state.activeCategory) {
      case "large-files":
        items = state.largeFiles;
        break;
      case "app-caches":
        items = state.appCaches;
        break;
      case "installed-apps":
        items = state.installedApps.map((app) => ({ id: app.path }));
        break;
    }

    const ids = items.map((i) => i.id || i.path || "");
    const allSelected = ids.every((id) => state.selectedItems.has(id));

    if (allSelected) {
      set({ selectedItems: new Set() });
    } else {
      set({ selectedItems: new Set(ids) });
    }
  },

  clearSelection: () => set({ selectedItems: new Set() }),

  getSelectedCount: () => get().selectedItems.size,

  getSelectedSize: () => {
    const state = get();
    let total = 0;

    for (const id of state.selectedItems) {
      const file = state.largeFiles.find((f) => f.id === id);
      if (file) {
        total += file.size;
        continue;
      }

      const cache = state.appCaches.find((c) => c.id === id);
      if (cache) {
        total += cache.size;
        continue;
      }

      const app = state.installedApps.find((a) => a.path === id);
      if (app) {
        total += app.size;
      }
    }

    return total;
  },

  // Scanning
  scanLargeFiles: async () => {
    set({ isScanning: true, error: null });
    try {
      const result = await invoke<ScanResult>("scan_large_files", {
        minSizeMb: get().largeFileThreshold,
      });

      set({
        largeFiles: result.items,
        largeFilesTotalSize: result.totalSize,
        isScanning: false,
        lastScanTime: { ...get().lastScanTime, "large-files": Date.now() },
      });
    } catch (error) {
      set({ error: handleError(error, "SystemCleanerStore.scanLargeFiles"), isScanning: false });
    }
  },

  scanAppCaches: async () => {
    set({ isScanning: true, error: null });
    try {
      const result = await invoke<ScanResult>("scan_app_caches");

      set({
        appCaches: result.items,
        appCachesTotalSize: result.totalSize,
        isScanning: false,
        lastScanTime: { ...get().lastScanTime, "app-caches": Date.now() },
      });
    } catch (error) {
      set({ error: handleError(error, "SystemCleanerStore.scanAppCaches"), isScanning: false });
    }
  },

  scanInstalledApps: async () => {
    set({ isScanning: true, error: null });
    try {
      const apps = await invoke<InstalledApp[]>("scan_installed_apps");
      const totalSize = apps.reduce((sum, app) => sum + app.size, 0);

      set({
        installedApps: apps,
        installedAppsTotalSize: totalSize,
        isScanning: false,
        lastScanTime: { ...get().lastScanTime, "installed-apps": Date.now() },
      });
    } catch (error) {
      set({ error: handleError(error, "SystemCleanerStore.scanInstalledApps"), isScanning: false });
    }
  },

  scanCurrentCategory: async () => {
    const { activeCategory } = get();
    switch (activeCategory) {
      case "large-files":
        await get().scanLargeFiles();
        break;
      case "app-caches":
        await get().scanAppCaches();
        break;
      case "installed-apps":
        await get().scanInstalledApps();
        break;
    }
  },

  // Deletion
  deleteSelected: async () => {
    const state = get();
    const paths: string[] = [];

    // Collect paths based on category
    for (const id of state.selectedItems) {
      const file = state.largeFiles.find((f) => f.id === id);
      if (file) {
        paths.push(file.path);
        continue;
      }

      const cache = state.appCaches.find((c) => c.id === id);
      if (cache) {
        paths.push(cache.path);
        continue;
      }

      // For apps, the id IS the path
      if (state.activeCategory === "installed-apps") {
        paths.push(id);
      }
    }

    if (paths.length === 0) return null;

    set({ isDeleting: true, error: null });
    try {
      const result = await invoke<DeleteResult>("cleaner_delete_to_trash", {
        paths,
      });

      // Clear selection
      set({ selectedItems: new Set(), isDeleting: false });

      // Refresh current category
      await get().scanCurrentCategory();

      return result;
    } catch (error) {
      set({ error: handleError(error, "SystemCleanerStore.deleteSelectedItems"), isDeleting: false });
      return null;
    }
  },

  uninstallApp: async (appPath: string) => {
    set({ isDeleting: true, error: null });
    try {
      const result = await invoke<DeleteResult>("uninstall_app", { appPath });

      set({ isDeleting: false });

      // Refresh apps list
      await get().scanInstalledApps();

      return result;
    } catch (error) {
      set({ error: handleError(error, "SystemCleanerStore.uninstallApp"), isDeleting: false });
      return null;
    }
  },

  // Utility
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      largeFiles: [],
      appCaches: [],
      installedApps: [],
      largeFilesTotalSize: 0,
      appCachesTotalSize: 0,
      installedAppsTotalSize: 0,
      selectedItems: new Set(),
      isScanning: false,
      isDeleting: false,
      error: null,
    }),
}));

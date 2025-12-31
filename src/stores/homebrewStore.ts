import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { handleError } from "@/lib/errorHandler";
import type {
  BrewPackage,
  BrewSearchResult,
  BrewPackageInfo,
  BrewTap,
  BrewDoctorResult,
  CommandOutput,
  ViewMode,
  FilterType,
} from "@/types/homebrew";

interface HomebrewStore {
  // Homebrew status
  isBrewInstalled: boolean | null;
  brewVersion: string | null;

  // Packages
  installedPackages: BrewPackage[];
  outdatedPackages: BrewPackage[];
  searchResults: BrewSearchResult[];
  selectedPackage: BrewPackageInfo | null;

  // Taps & Doctor
  taps: BrewTap[];
  doctorResult: BrewDoctorResult | null;

  // UI State
  viewMode: ViewMode;
  filterType: FilterType;
  searchQuery: string;
  isLoading: boolean;
  isOperating: boolean;
  operationMessage: string;
  error: string | null;

  // Actions - Check
  checkBrewInstalled: () => Promise<void>;

  // Actions - Packages
  fetchInstalledPackages: () => Promise<void>;
  fetchOutdatedPackages: () => Promise<void>;
  searchPackages: (query: string) => Promise<void>;
  fetchPackageInfo: (name: string, isCask: boolean) => Promise<void>;
  installPackage: (name: string, isCask: boolean) => Promise<boolean>;
  uninstallPackage: (name: string, isCask: boolean) => Promise<boolean>;
  upgradePackage: (name: string | null, isCask: boolean) => Promise<boolean>;
  pinPackage: (name: string) => Promise<boolean>;
  unpinPackage: (name: string) => Promise<boolean>;

  // Actions - Brew
  updateBrew: () => Promise<boolean>;
  cleanup: (dryRun: boolean) => Promise<string>;

  // Actions - Taps
  fetchTaps: () => Promise<void>;
  addTap: (repo: string) => Promise<boolean>;
  removeTap: (repo: string) => Promise<boolean>;

  // Actions - Doctor
  runDoctor: () => Promise<void>;

  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  setFilterType: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
  clearSelectedPackage: () => void;
  refresh: () => Promise<void>;
}

export const useHomebrewStore = create<HomebrewStore>((set, get) => ({
  // Initial state
  isBrewInstalled: null,
  brewVersion: null,
  installedPackages: [],
  outdatedPackages: [],
  searchResults: [],
  selectedPackage: null,
  taps: [],
  doctorResult: null,
  viewMode: "installed",
  filterType: "all",
  searchQuery: "",
  isLoading: false,
  isOperating: false,
  operationMessage: "",
  error: null,

  // Check if Homebrew is installed
  checkBrewInstalled: async () => {
    try {
      const installed = await invoke<boolean>("brew_check_installed");
      set({ isBrewInstalled: installed });

      if (installed) {
        const version = await invoke<string>("brew_version");
        set({ brewVersion: version });
      }
    } catch (error) {
      set({ isBrewInstalled: false, error: handleError(error, "HomebrewStore.checkBrewInstalled") });
    }
  },

  // Fetch installed packages
  fetchInstalledPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const packages = await invoke<BrewPackage[]>("brew_list_installed");
      set({ installedPackages: packages, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.fetchInstalledPackages"), isLoading: false });
    }
  },

  // Fetch outdated packages
  fetchOutdatedPackages: async () => {
    set({ isLoading: true, error: null });
    try {
      const packages = await invoke<BrewPackage[]>("brew_list_outdated");
      set({ outdatedPackages: packages, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.fetchOutdatedPackages"), isLoading: false });
    }
  },

  // Search packages
  searchPackages: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    set({ isLoading: true, error: null, searchQuery: query });
    try {
      const results = await invoke<BrewSearchResult[]>("brew_search", { query });
      set({ searchResults: results, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.searchPackages"), isLoading: false });
    }
  },

  // Fetch package info
  fetchPackageInfo: async (name: string, isCask: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const info = await invoke<BrewPackageInfo>("brew_info", {
        packageName: name,
        isCask,
      });
      set({ selectedPackage: info, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.fetchPackageInfo"), isLoading: false });
    }
  },

  // Install package
  installPackage: async (name: string, isCask: boolean) => {
    set({ isOperating: true, operationMessage: `Installing ${name}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_install", {
        packageName: name,
        isCask,
      });

      if (result.success) {
        set({ isOperating: false, operationMessage: "" });
        // Refresh installed packages
        get().fetchInstalledPackages();
        return true;
      } else {
        set({
          isOperating: false,
          operationMessage: "",
          error: result.stderr || "Installation failed",
        });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.installPackage") });
      return false;
    }
  },

  // Uninstall package
  uninstallPackage: async (name: string, isCask: boolean) => {
    set({ isOperating: true, operationMessage: `Uninstalling ${name}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_uninstall", {
        packageName: name,
        isCask,
      });

      if (result.success) {
        set({ isOperating: false, operationMessage: "", selectedPackage: null });
        // Refresh installed packages
        get().fetchInstalledPackages();
        return true;
      } else {
        set({
          isOperating: false,
          operationMessage: "",
          error: result.stderr || "Uninstallation failed",
        });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.uninstallPackage") });
      return false;
    }
  },

  // Upgrade package (or all if name is null)
  upgradePackage: async (name: string | null, isCask: boolean) => {
    const msg = name ? `Upgrading ${name}...` : "Upgrading all packages...";
    set({ isOperating: true, operationMessage: msg, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_upgrade", {
        packageName: name,
        isCask,
      });

      if (result.success) {
        set({ isOperating: false, operationMessage: "" });
        // Refresh packages
        get().fetchInstalledPackages();
        get().fetchOutdatedPackages();
        return true;
      } else {
        set({
          isOperating: false,
          operationMessage: "",
          error: result.stderr || "Upgrade failed",
        });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.upgradePackage") });
      return false;
    }
  },

  // Pin package
  pinPackage: async (name: string) => {
    set({ isOperating: true, operationMessage: `Pinning ${name}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_pin", { packageName: name });
      set({ isOperating: false, operationMessage: "" });

      if (result.success) {
        get().fetchInstalledPackages();
        return true;
      }
      return false;
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.pinPackage") });
      return false;
    }
  },

  // Unpin package
  unpinPackage: async (name: string) => {
    set({ isOperating: true, operationMessage: `Unpinning ${name}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_unpin", { packageName: name });
      set({ isOperating: false, operationMessage: "" });

      if (result.success) {
        get().fetchInstalledPackages();
        return true;
      }
      return false;
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.unpinPackage") });
      return false;
    }
  },

  // Update Homebrew
  updateBrew: async () => {
    set({ isOperating: true, operationMessage: "Updating Homebrew...", error: null });
    try {
      const result = await invoke<CommandOutput>("brew_update");
      set({ isOperating: false, operationMessage: "" });

      if (result.success) {
        // Refresh outdated after update
        get().fetchOutdatedPackages();
        return true;
      } else {
        set({ error: result.stderr || "Update failed" });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.updateBrew") });
      return false;
    }
  },

  // Cleanup
  cleanup: async (dryRun: boolean) => {
    set({ isOperating: true, operationMessage: "Cleaning up...", error: null });
    try {
      const result = await invoke<CommandOutput>("brew_cleanup", { dryRun });
      set({ isOperating: false, operationMessage: "" });
      return result.stdout;
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.cleanup") });
      return "";
    }
  },

  // Fetch taps
  fetchTaps: async () => {
    set({ isLoading: true, error: null });
    try {
      const taps = await invoke<BrewTap[]>("brew_list_taps");
      set({ taps, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.fetchTaps"), isLoading: false });
    }
  },

  // Add tap
  addTap: async (repo: string) => {
    set({ isOperating: true, operationMessage: `Adding tap ${repo}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_tap", { repo });
      set({ isOperating: false, operationMessage: "" });

      if (result.success) {
        get().fetchTaps();
        return true;
      } else {
        set({ error: result.stderr || "Failed to add tap" });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.addTap") });
      return false;
    }
  },

  // Remove tap
  removeTap: async (repo: string) => {
    set({ isOperating: true, operationMessage: `Removing tap ${repo}...`, error: null });
    try {
      const result = await invoke<CommandOutput>("brew_untap", { repo });
      set({ isOperating: false, operationMessage: "" });

      if (result.success) {
        get().fetchTaps();
        return true;
      } else {
        set({ error: result.stderr || "Failed to remove tap" });
        return false;
      }
    } catch (error) {
      set({ isOperating: false, operationMessage: "", error: handleError(error, "HomebrewStore.removeTap") });
      return false;
    }
  },

  // Run doctor
  runDoctor: async () => {
    set({ isLoading: true, error: null, doctorResult: null });
    try {
      const result = await invoke<BrewDoctorResult>("brew_doctor");
      set({ doctorResult: result, isLoading: false });
    } catch (error) {
      set({ error: handleError(error, "HomebrewStore.runDoctor"), isLoading: false });
    }
  },

  // UI actions
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setFilterType: (filter: FilterType) => set({ filterType: filter }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  clearError: () => set({ error: null }),
  clearSelectedPackage: () => set({ selectedPackage: null }),

  // Refresh all data
  refresh: async () => {
    const { viewMode } = get();
    set({ isLoading: true });

    await get().checkBrewInstalled();

    if (viewMode === "installed") {
      await get().fetchInstalledPackages();
    } else if (viewMode === "outdated") {
      await get().fetchOutdatedPackages();
    } else if (viewMode === "taps") {
      await get().fetchTaps();
    }

    set({ isLoading: false });
  },
}));

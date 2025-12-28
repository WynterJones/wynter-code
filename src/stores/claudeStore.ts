import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  ClaudeFile,
  ClaudeFileType,
  ClaudeFileScope,
  ClaudeSettings,
  ClaudeVersionInfo,
} from "@/types";

export type ClaudeManagerTab = "commands" | "skills" | "subagents" | "settings";

interface ClaudeStore {
  // State
  isPopupOpen: boolean;
  isDropdownOpen: boolean;
  activeTab: ClaudeManagerTab;
  activeScope: ClaudeFileScope;
  selectedFile: ClaudeFile | null;

  // File lists
  commands: ClaudeFile[];
  skills: ClaudeFile[];
  subagents: ClaudeFile[];

  // Settings
  userSettings: ClaudeSettings;
  projectSettings: ClaudeSettings;
  localSettings: ClaudeSettings;

  // Version info
  versionInfo: ClaudeVersionInfo;
  isCheckingUpdate: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions - UI
  openPopup: () => void;
  closePopup: () => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  setActiveTab: (tab: ClaudeManagerTab) => void;
  setActiveScope: (scope: ClaudeFileScope) => void;
  setSelectedFile: (file: ClaudeFile | null) => void;

  // Actions - Data loading
  loadFiles: (fileType: ClaudeFileType, projectPath: string) => Promise<void>;
  loadAllFiles: (projectPath: string) => Promise<void>;
  loadSettings: (projectPath: string) => Promise<void>;

  // Actions - File operations
  saveFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  createFile: (scope: ClaudeFileScope, fileType: ClaudeFileType, name: string, projectPath?: string) => Promise<string>;

  // Actions - Settings
  saveSettings: (scope: "user" | "project" | "local", projectPath: string | null, settings: ClaudeSettings) => Promise<void>;

  // Actions - Version
  getVersion: () => Promise<void>;
  checkForUpdate: () => Promise<void>;
}

export const useClaudeStore = create<ClaudeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isPopupOpen: false,
      isDropdownOpen: false,
      activeTab: "commands",
      activeScope: "project",
      selectedFile: null,

      commands: [],
      skills: [],
      subagents: [],

      userSettings: {},
      projectSettings: {},
      localSettings: {},

      versionInfo: {
        current: "unknown",
        latest: null,
        updateAvailable: false,
        lastChecked: null,
      },
      isCheckingUpdate: false,

      isLoading: false,
      error: null,

      // UI Actions
      openPopup: () => set({ isPopupOpen: true, isDropdownOpen: false }),
      closePopup: () => set({ isPopupOpen: false, selectedFile: null }),
      toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),
      closeDropdown: () => set({ isDropdownOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab, selectedFile: null }),
      setActiveScope: (scope) => set({ activeScope: scope, selectedFile: null }),
      setSelectedFile: (file) => set({ selectedFile: file }),

      // Data loading
      loadFiles: async (fileType, projectPath) => {
        set({ isLoading: true, error: null });
        try {
          const userFiles = await invoke<ClaudeFile[]>("get_claude_files", {
            scope: "user",
            fileType,
            projectPath: null,
          });

          const projectFiles = await invoke<ClaudeFile[]>("get_claude_files", {
            scope: "project",
            fileType,
            projectPath,
          });

          const allFiles = [...userFiles, ...projectFiles];

          switch (fileType) {
            case "command":
              set({ commands: allFiles });
              break;
            case "skill":
              set({ skills: allFiles });
              break;
            case "subagent":
              set({ subagents: allFiles });
              break;
          }
        } catch (error) {
          set({ error: String(error) });
        } finally {
          set({ isLoading: false });
        }
      },

      loadAllFiles: async (projectPath) => {
        const { loadFiles } = get();
        await Promise.all([
          loadFiles("command", projectPath),
          loadFiles("skill", projectPath),
          loadFiles("subagent", projectPath),
        ]);
      },

      loadSettings: async (projectPath) => {
        set({ isLoading: true, error: null });
        try {
          const [userSettings, projectSettings, localSettings] = await Promise.all([
            invoke<ClaudeSettings>("get_claude_settings", { scope: "user", projectPath: null }),
            invoke<ClaudeSettings>("get_claude_settings", { scope: "project", projectPath }),
            invoke<ClaudeSettings>("get_claude_settings", { scope: "local", projectPath }),
          ]);

          set({ userSettings, projectSettings, localSettings });
        } catch (error) {
          set({ error: String(error) });
        } finally {
          set({ isLoading: false });
        }
      },

      // File operations
      saveFile: async (path, content) => {
        set({ isLoading: true, error: null });
        try {
          await invoke("write_claude_file", { path, content });
        } catch (error) {
          set({ error: String(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      deleteFile: async (path) => {
        set({ isLoading: true, error: null });
        try {
          await invoke("delete_claude_file", { path });
          set({ selectedFile: null });
        } catch (error) {
          set({ error: String(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      createFile: async (scope, fileType, name, projectPath) => {
        set({ isLoading: true, error: null });
        try {
          const path = await invoke<string>("create_claude_file", {
            scope,
            fileType,
            name,
            projectPath: scope === "project" ? projectPath : null,
          });
          return path;
        } catch (error) {
          set({ error: String(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Settings operations
      saveSettings: async (scope, projectPath, settings) => {
        set({ isLoading: true, error: null });
        try {
          await invoke("write_claude_settings", { scope, projectPath, settings });

          switch (scope) {
            case "user":
              set({ userSettings: settings });
              break;
            case "project":
              set({ projectSettings: settings });
              break;
            case "local":
              set({ localSettings: settings });
              break;
          }
        } catch (error) {
          set({ error: String(error) });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Version operations
      getVersion: async () => {
        try {
          const versionInfo = await invoke<ClaudeVersionInfo>("get_claude_version");
          set({ versionInfo });
        } catch (error) {
          console.error("Failed to get Claude version:", error);
        }
      },

      checkForUpdate: async () => {
        set({ isCheckingUpdate: true });
        try {
          const versionInfo = await invoke<ClaudeVersionInfo>("check_claude_update");
          set({ versionInfo, isCheckingUpdate: false });
        } catch (error) {
          console.error("Failed to check for updates:", error);
          set({ isCheckingUpdate: false });
        }
      },
    }),
    {
      name: "wynter-code-claude",
      partialize: (state) => ({ versionInfo: state.versionInfo }),
    }
  )
);

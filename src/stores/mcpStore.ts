import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { McpServer, McpServerInput, McpScope } from "@/types";
import { isSensitiveKey } from "@/lib/sensitiveKeyDetection";
import { handleError } from "@/lib/errorHandler";

export { isSensitiveKey as isSensitiveEnvKey };

interface McpStore {
  // Popup state
  isPopupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;

  // Data state
  servers: McpServer[];
  isLoading: boolean;
  error: string | null;

  // Filter state
  activeScope: McpScope | "all";
  setActiveScope: (scope: McpScope | "all") => void;

  // Selection state
  selectedServer: McpServer | null;
  setSelectedServer: (server: McpServer | null) => void;

  // Form state
  isFormOpen: boolean;
  editingServer: McpServer | null;
  openForm: (server?: McpServer) => void;
  closeForm: () => void;

  // Revealed env vars
  revealedEnvKeys: Set<string>;
  revealEnvKey: (serverName: string, key: string) => void;
  hideEnvKey: (serverName: string, key: string) => void;
  hideAllEnvKeys: () => void;

  // Data operations
  loadServers: (projectPath?: string) => Promise<void>;
  saveServer: (server: McpServerInput) => Promise<void>;
  deleteServer: (name: string, scope: McpScope, projectPath?: string) => Promise<void>;
  toggleServer: (name: string, enabled: boolean) => Promise<void>;
  validateCommand: (command: string) => Promise<boolean>;
}

export const useMcpStore = create<McpStore>((set, get) => ({
  // Popup state
  isPopupOpen: false,
  openPopup: () => set({ isPopupOpen: true }),
  closePopup: () => {
    set({
      isPopupOpen: false,
      selectedServer: null,
      isFormOpen: false,
      editingServer: null,
    });
    get().hideAllEnvKeys();
  },

  // Data state
  servers: [],
  isLoading: false,
  error: null,

  // Filter state
  activeScope: "all",
  setActiveScope: (scope) => set({ activeScope: scope }),

  // Selection state
  selectedServer: null,
  setSelectedServer: (server) => set({ selectedServer: server }),

  // Form state
  isFormOpen: false,
  editingServer: null,
  openForm: (server) => set({ isFormOpen: true, editingServer: server || null }),
  closeForm: () => set({ isFormOpen: false, editingServer: null }),

  // Revealed env vars
  revealedEnvKeys: new Set<string>(),
  revealEnvKey: (serverName, key) => {
    set((state) => {
      const newSet = new Set(state.revealedEnvKeys);
      newSet.add(`${serverName}:${key}`);
      return { revealedEnvKeys: newSet };
    });
  },
  hideEnvKey: (serverName, key) => {
    set((state) => {
      const newSet = new Set(state.revealedEnvKeys);
      newSet.delete(`${serverName}:${key}`);
      return { revealedEnvKeys: newSet };
    });
  },
  hideAllEnvKeys: () => set({ revealedEnvKeys: new Set() }),

  // Data operations
  loadServers: async (projectPath) => {
    set({ isLoading: true, error: null });
    try {
      const servers = await invoke<McpServer[]>("get_mcp_servers", {
        projectPath,
      });
      set({ servers, isLoading: false });
    } catch (error) {
      set({
        error: handleError(error, "McpStore.loadServers"),
        isLoading: false,
      });
    }
  },

  saveServer: async (server) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("save_mcp_server", { server });
      // Reload servers after save
      const projectPath = server.projectPath;
      await get().loadServers(projectPath);
      set({ isFormOpen: false, editingServer: null });
    } catch (error) {
      set({
        error: handleError(error, "McpStore.saveServer"),
        isLoading: false,
      });
      throw error;
    }
  },

  deleteServer: async (name, scope, projectPath) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("delete_mcp_server", { name, scope, projectPath });
      // Reload servers after delete
      await get().loadServers(projectPath);
    } catch (error) {
      set({
        error: handleError(error, "McpStore.deleteServer"),
        isLoading: false,
      });
      throw error;
    }
  },

  toggleServer: async (name, enabled) => {
    set({ isLoading: true, error: null });
    try {
      await invoke("toggle_mcp_server", { name, enabled });
      // Update local state immediately
      set((state) => ({
        servers: state.servers.map((s) =>
          s.name === name ? { ...s, isEnabled: enabled } : s
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: handleError(error, "McpStore.toggleServer"),
        isLoading: false,
      });
      throw error;
    }
  },

  validateCommand: async (command) => {
    try {
      return await invoke<boolean>("validate_mcp_command", { command });
    } catch {
      return false;
    }
  },
}));

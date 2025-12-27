import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface FileIndexCache {
  files: string[];
  loading: boolean;
  lastUpdated: number;
}

interface FileIndexStore {
  cache: Record<string, FileIndexCache>;

  getFiles: (projectPath: string) => string[];
  isLoading: (projectPath: string) => boolean;
  loadIndex: (projectPath: string) => Promise<void>;
  refreshIndex: (projectPath: string) => Promise<void>;
  clearIndex: (projectPath: string) => void;
}

export const useFileIndexStore = create<FileIndexStore>((set, get) => ({
  cache: {},

  getFiles: (projectPath: string) => {
    return get().cache[projectPath]?.files || [];
  },

  isLoading: (projectPath: string) => {
    return get().cache[projectPath]?.loading || false;
  },

  loadIndex: async (projectPath: string) => {
    const existing = get().cache[projectPath];
    if (existing && existing.files.length > 0) {
      return;
    }

    set((state) => ({
      cache: {
        ...state.cache,
        [projectPath]: {
          files: [],
          loading: true,
          lastUpdated: 0,
        },
      },
    }));

    try {
      const files = await invoke<string[]>("list_project_files", {
        projectPath,
      });

      set((state) => ({
        cache: {
          ...state.cache,
          [projectPath]: {
            files,
            loading: false,
            lastUpdated: Date.now(),
          },
        },
      }));
    } catch (error) {
      console.error("[FileIndexStore] Failed to load file index:", error);
      set((state) => ({
        cache: {
          ...state.cache,
          [projectPath]: {
            files: [],
            loading: false,
            lastUpdated: 0,
          },
        },
      }));
    }
  },

  refreshIndex: async (projectPath: string) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [projectPath]: {
          ...state.cache[projectPath],
          loading: true,
        },
      },
    }));

    try {
      const files = await invoke<string[]>("list_project_files", {
        projectPath,
      });

      set((state) => ({
        cache: {
          ...state.cache,
          [projectPath]: {
            files,
            loading: false,
            lastUpdated: Date.now(),
          },
        },
      }));
    } catch (error) {
      console.error("[FileIndexStore] Failed to refresh file index:", error);
      set((state) => ({
        cache: {
          ...state.cache,
          [projectPath]: {
            ...state.cache[projectPath],
            loading: false,
          },
        },
      }));
    }
  },

  clearIndex: (projectPath: string) => {
    set((state) => {
      const { [projectPath]: _, ...rest } = state.cache;
      return { cache: rest };
    });
  },
}));

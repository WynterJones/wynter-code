import { create } from "zustand";

type PopupType = "editor" | "markdown";

interface MinimizedPopup {
  id: string;
  filePath: string;
  fileName: string;
  type: PopupType;
  projectId: string;
}

interface MinimizedPopupsState {
  minimizedPopups: MinimizedPopup[];
  pendingRestore: MinimizedPopup | null;
  minimize: (popup: Omit<MinimizedPopup, "id" | "fileName">) => void;
  restore: (id: string) => void;
  clearPendingRestore: () => void;
  remove: (id: string) => void;
  getPopupsForProject: (projectId: string) => MinimizedPopup[];
  isMinimized: (filePath: string, projectId: string) => boolean;
}

export const useMinimizedPopupsStore = create<MinimizedPopupsState>((set, get) => ({
  minimizedPopups: [],
  pendingRestore: null,

  minimize: (popup) => {
    const fileName = popup.filePath.split("/").pop() || popup.filePath;
    const id = `${popup.projectId}-${popup.filePath}`;

    set((state) => {
      const exists = state.minimizedPopups.some((p) => p.id === id);
      if (exists) return state;

      return {
        minimizedPopups: [
          ...state.minimizedPopups,
          { ...popup, id, fileName },
        ],
      };
    });
  },

  restore: (id) => {
    const popup = get().minimizedPopups.find((p) => p.id === id);
    if (popup) {
      set((state) => ({
        minimizedPopups: state.minimizedPopups.filter((p) => p.id !== id),
        pendingRestore: popup,
      }));
    }
  },

  clearPendingRestore: () => {
    set({ pendingRestore: null });
  },

  remove: (id) => {
    set((state) => ({
      minimizedPopups: state.minimizedPopups.filter((p) => p.id !== id),
    }));
  },

  getPopupsForProject: (projectId) => {
    return get().minimizedPopups.filter((p) => p.projectId === projectId);
  },

  isMinimized: (filePath, projectId) => {
    const id = `${projectId}-${filePath}`;
    return get().minimizedPopups.some((p) => p.id === id);
  },
}));

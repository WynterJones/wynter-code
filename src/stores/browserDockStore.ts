import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export interface DockFavorite {
  id: string;
  url: string;
  title: string;
  faviconUrl: string | null;
  order: number;
  createdAt: number;
  customCSS: string | null;
  customJS: string | null;
}

interface BrowserWindowSize {
  width: number;
  height: number;
}

interface BrowserDockStore {
  favorites: DockFavorite[];
  browserWindowSize: BrowserWindowSize;
  currentBrowserUrl: string | null;

  addFavorite: (favorite: Omit<DockFavorite, "id" | "createdAt" | "order">) => void;
  updateFavorite: (id: string, updates: Partial<DockFavorite>) => void;
  removeFavorite: (id: string) => void;
  reorderFavorites: (activeId: string, overId: string) => void;
  reorderFavoritesById: (orderedIds: string[]) => void;

  setBrowserWindowSize: (width: number, height: number) => void;
  setCurrentBrowserUrl: (url: string | null) => void;

  getFavoriteByUrl: (url: string) => DockFavorite | undefined;
  getSortedFavorites: () => DockFavorite[];
}

export const useBrowserDockStore = create<BrowserDockStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      browserWindowSize: { width: 1200, height: 800 },
      currentBrowserUrl: null,

      addFavorite: (favorite) => {
        const { favorites } = get();
        const maxOrder = favorites.length > 0
          ? Math.max(...favorites.map((f) => f.order))
          : -1;

        const newFavorite: DockFavorite = {
          ...favorite,
          id: uuidv4(),
          order: maxOrder + 1,
          createdAt: Date.now(),
        };

        set((state) => ({
          favorites: [...state.favorites, newFavorite],
        }));
      },

      updateFavorite: (id, updates) => {
        set((state) => ({
          favorites: state.favorites.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        }));
      },

      removeFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        }));
      },

      reorderFavorites: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.favorites.findIndex((f) => f.id === activeId);
          const newIndex = state.favorites.findIndex((f) => f.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newFavorites = [...state.favorites];
          const [movedItem] = newFavorites.splice(oldIndex, 1);
          newFavorites.splice(newIndex, 0, movedItem);

          return {
            favorites: newFavorites.map((f, index) => ({
              ...f,
              order: index,
            })),
          };
        });
      },

      reorderFavoritesById: (orderedIds) => {
        set((state) => {
          const favoriteMap = new Map(state.favorites.map((f) => [f.id, f]));
          const newFavorites = orderedIds
            .map((id) => favoriteMap.get(id))
            .filter((f): f is DockFavorite => f !== undefined)
            .map((f, index) => ({ ...f, order: index }));

          return { favorites: newFavorites };
        });
      },

      setBrowserWindowSize: (width, height) =>
        set({ browserWindowSize: { width, height } }),

      setCurrentBrowserUrl: (url) => set({ currentBrowserUrl: url }),

      getFavoriteByUrl: (url) => {
        const { favorites } = get();
        return favorites.find((f) => f.url === url);
      },

      getSortedFavorites: () => {
        const { favorites } = get();
        return [...favorites].sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: "browser-dock-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        browserWindowSize: state.browserWindowSize,
      }),
    }
  )
);

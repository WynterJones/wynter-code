import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SearchMode = "all" | "apps" | "tools";

interface LauncherUsage {
  lastUsed: Record<string, number>;
  usageCount: Record<string, number>;
}

interface LauncherState {
  query: string;
  selectedIndex: number;
  totalItems: number;
  isActionsPanelOpen: boolean;
  searchMode: SearchMode;
  usage: LauncherUsage;

  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  setTotalItems: (total: number) => void;
  toggleActionsPanel: () => void;
  closeActionsPanel: () => void;
  setSearchMode: (mode: SearchMode) => void;
  cycleSearchMode: () => void;
  recordUsage: (itemId: string) => void;
  getRecencyScore: (itemId: string) => number;
  getFrequencyScore: (itemId: string) => number;
  reset: () => void;
}

const SEARCH_MODES: SearchMode[] = ["all", "apps", "tools"];

export const useLauncherStore = create<LauncherState>()(
  persist(
    (set, get) => ({
      query: "",
      selectedIndex: 0,
      totalItems: 0,
      isActionsPanelOpen: false,
      searchMode: "all",
      usage: {
        lastUsed: {},
        usageCount: {},
      },

      setQuery: (query) => set({ query, selectedIndex: 0 }),

      setSelectedIndex: (index) => set({ selectedIndex: index }),

      setTotalItems: (total) => set({ totalItems: total }),

      toggleActionsPanel: () =>
        set((state) => ({ isActionsPanelOpen: !state.isActionsPanelOpen })),

      closeActionsPanel: () => set({ isActionsPanelOpen: false }),

      setSearchMode: (mode) => set({ searchMode: mode, selectedIndex: 0 }),

      cycleSearchMode: () => {
        const { searchMode } = get();
        const currentIndex = SEARCH_MODES.indexOf(searchMode);
        const nextIndex = (currentIndex + 1) % SEARCH_MODES.length;
        set({ searchMode: SEARCH_MODES[nextIndex], selectedIndex: 0 });
      },

      recordUsage: (itemId) => {
        const { usage } = get();
        const now = Date.now();
        set({
          usage: {
            lastUsed: { ...usage.lastUsed, [itemId]: now },
            usageCount: {
              ...usage.usageCount,
              [itemId]: (usage.usageCount[itemId] || 0) + 1,
            },
          },
        });
      },

      getRecencyScore: (itemId) => {
        const { usage } = get();
        const lastUsed = usage.lastUsed[itemId];
        if (!lastUsed) return 0;

        const hoursSince = (Date.now() - lastUsed) / (1000 * 60 * 60);
        if (hoursSince < 1) return 20;
        if (hoursSince < 24) return 15;
        if (hoursSince < 168) return 10; // 1 week
        return 5;
      },

      getFrequencyScore: (itemId) => {
        const { usage } = get();
        const count = usage.usageCount[itemId] || 0;
        return Math.min(count * 2, 20);
      },

      reset: () =>
        set({
          query: "",
          selectedIndex: 0,
          totalItems: 0,
          isActionsPanelOpen: false,
          searchMode: "all",
        }),
    }),
    {
      name: "launcher-store",
      partialize: (state) => ({
        usage: state.usage,
        searchMode: state.searchMode,
      }),
    }
  )
);

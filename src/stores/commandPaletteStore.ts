import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  totalItems: number;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  setTotalItems: (count: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  reset: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: "",
  selectedIndex: 0,
  totalItems: 0,

  open: () => set({ isOpen: true, query: "", selectedIndex: 0 }),
  close: () => set({ isOpen: false }),
  toggle: () => {
    const { isOpen } = get();
    if (isOpen) {
      set({ isOpen: false });
    } else {
      set({ isOpen: true, query: "", selectedIndex: 0 });
    }
  },
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setTotalItems: (count) => set({ totalItems: count }),
  selectNext: () => {
    const { selectedIndex, totalItems } = get();
    if (totalItems > 0) {
      set({ selectedIndex: (selectedIndex + 1) % totalItems });
    }
  },
  selectPrevious: () => {
    const { selectedIndex, totalItems } = get();
    if (totalItems > 0) {
      set({ selectedIndex: selectedIndex > 0 ? selectedIndex - 1 : totalItems - 1 });
    }
  },
  reset: () => set({ query: "", selectedIndex: 0 }),
}));

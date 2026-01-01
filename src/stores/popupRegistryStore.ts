import { create } from "zustand";

interface PopupRegistryState {
  openModalCount: number;
  registerModal: () => void;
  unregisterModal: () => void;
}

export const usePopupRegistryStore = create<PopupRegistryState>((set) => ({
  openModalCount: 0,

  registerModal: () => set((state) => ({
    openModalCount: state.openModalCount + 1
  })),

  unregisterModal: () => set((state) => ({
    openModalCount: Math.max(0, state.openModalCount - 1)
  })),
}));

// Selector for checking if any popup is open
export const selectHasOpenPopup = (state: PopupRegistryState) => state.openModalCount > 0;

import { create } from "zustand";
import { useEffect } from "react";

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

/**
 * Hook that registers/unregisters a popup with the popup registry.
 * Use this in popups that don't use the Modal component but should
 * hide the farmwork mini player when open.
 */
export function usePopupVisibility(isOpen: boolean) {
  const { registerModal, unregisterModal } = usePopupRegistryStore();

  useEffect(() => {
    if (isOpen) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isOpen, registerModal, unregisterModal]);
}

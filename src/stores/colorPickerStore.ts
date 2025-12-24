import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorValue, SavedColor, ColorFormat } from "@/types/color";
import { rgbToHex } from "@/lib/colorUtils";

const MAX_RECENT_COLORS = 20;

interface ColorPickerStore {
  currentColor: ColorValue | null;
  selectedFormat: ColorFormat;
  recentColors: SavedColor[];
  savedColors: SavedColor[];

  // Settings
  autoCopyOnPick: boolean;
  defaultFormat: ColorFormat;
  openPickerAfterPick: boolean;

  setCurrentColor: (color: ColorValue) => void;
  setSelectedFormat: (format: ColorFormat) => void;
  addRecentColor: (color: ColorValue) => void;
  saveColor: (color: SavedColor) => void;
  deleteColor: (id: string) => void;
  clearRecentColors: () => void;
  clearSavedColors: () => void;

  // Settings setters
  setAutoCopyOnPick: (value: boolean) => void;
  setDefaultFormat: (format: ColorFormat) => void;
  setOpenPickerAfterPick: (value: boolean) => void;

  // Reset
  reset: () => void;
}

export const useColorPickerStore = create<ColorPickerStore>()(
  persist(
    (set) => ({
      currentColor: null,
      selectedFormat: "hex",
      recentColors: [],
      savedColors: [],

      // Settings defaults
      autoCopyOnPick: true,
      defaultFormat: "hex",
      openPickerAfterPick: true,

      setCurrentColor: (color: ColorValue) => {
        set({ currentColor: color });
      },

      setSelectedFormat: (format: ColorFormat) => {
        set({ selectedFormat: format });
      },

      addRecentColor: (color: ColorValue) => {
        const hex = rgbToHex(color.r, color.g, color.b);
        const newColor: SavedColor = {
          id: `${hex}-${Date.now()}`,
          value: color,
          hex,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          // Check if color already exists in recent (by hex)
          const existingIndex = state.recentColors.findIndex(
            (c) => c.hex === hex
          );

          let updatedRecent = [...state.recentColors];

          if (existingIndex !== -1) {
            // Move existing color to front
            updatedRecent.splice(existingIndex, 1);
          }

          // Add new color to front
          updatedRecent.unshift(newColor);

          // Limit to max recent colors
          if (updatedRecent.length > MAX_RECENT_COLORS) {
            updatedRecent = updatedRecent.slice(0, MAX_RECENT_COLORS);
          }

          return {
            recentColors: updatedRecent,
            currentColor: color,
          };
        });
      },

      saveColor: (color: SavedColor) => {
        set((state) => {
          // Check if already saved
          if (state.savedColors.some((c) => c.hex === color.hex)) {
            return state;
          }
          return {
            savedColors: [color, ...state.savedColors],
          };
        });
      },

      deleteColor: (id: string) => {
        set((state) => ({
          savedColors: state.savedColors.filter((c) => c.id !== id),
          recentColors: state.recentColors.filter((c) => c.id !== id),
        }));
      },

      clearRecentColors: () => {
        set({ recentColors: [] });
      },

      clearSavedColors: () => {
        set({ savedColors: [] });
      },

      // Settings setters
      setAutoCopyOnPick: (value: boolean) => {
        set({ autoCopyOnPick: value });
      },

      setDefaultFormat: (format: ColorFormat) => {
        set({ defaultFormat: format, selectedFormat: format });
      },

      setOpenPickerAfterPick: (value: boolean) => {
        set({ openPickerAfterPick: value });
      },

      reset: () => {
        set({
          currentColor: null,
          selectedFormat: "hex",
          recentColors: [],
          savedColors: [],
          autoCopyOnPick: true,
          defaultFormat: "hex",
          openPickerAfterPick: true,
        });
      },
    }),
    {
      name: "wynter-code-colors",
    }
  )
);

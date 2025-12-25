import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  RecipeExecution,
  RecipeExecutionStatus,
} from "@/components/tools/just-command-manager/types";

interface JustfileStore {
  // State
  executions: RecipeExecution[];
  favoriteRecipes: string[];
  recentRecipes: string[];

  // Actions
  addExecution: (recipeName: string, ptyId: string) => void;
  updateExecution: (recipeName: string, status: RecipeExecutionStatus) => void;
  removeExecution: (recipeName: string) => void;

  toggleFavorite: (recipeName: string) => void;
  addToRecent: (recipeName: string) => void;

  reset: () => void;
}

const MAX_RECENT = 10;

export const useJustfileStore = create<JustfileStore>()(
  persist(
    (set) => ({
      executions: [],
      favoriteRecipes: [],
      recentRecipes: [],

      addExecution: (recipeName, ptyId) =>
        set((state) => ({
          executions: [
            ...state.executions.filter((e) => e.recipeName !== recipeName),
            { recipeName, status: "running", startedAt: Date.now(), ptyId },
          ],
        })),

      updateExecution: (recipeName, status) =>
        set((state) => ({
          executions: state.executions.map((e) =>
            e.recipeName === recipeName ? { ...e, status } : e
          ),
        })),

      removeExecution: (recipeName) =>
        set((state) => ({
          executions: state.executions.filter((e) => e.recipeName !== recipeName),
        })),

      toggleFavorite: (recipeName) =>
        set((state) => {
          const isFav = state.favoriteRecipes.includes(recipeName);
          return {
            favoriteRecipes: isFav
              ? state.favoriteRecipes.filter((r) => r !== recipeName)
              : [...state.favoriteRecipes, recipeName],
          };
        }),

      addToRecent: (recipeName) =>
        set((state) => {
          const filtered = state.recentRecipes.filter((r) => r !== recipeName);
          return {
            recentRecipes: [recipeName, ...filtered].slice(0, MAX_RECENT),
          };
        }),

      reset: () =>
        set({
          executions: [],
          favoriteRecipes: [],
          recentRecipes: [],
        }),
    }),
    {
      name: "wynter-code-justfile",
      partialize: (state) => ({
        favoriteRecipes: state.favoriteRecipes,
        recentRecipes: state.recentRecipes,
      }),
    }
  )
);

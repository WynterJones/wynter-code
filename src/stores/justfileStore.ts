import { create } from "zustand";
import type {
  RecipeExecution,
  RecipeExecutionStatus,
} from "@/components/tools/just-command-manager/types";

interface JustfileStore {
  // State
  executions: RecipeExecution[];

  // Actions
  addExecution: (recipeName: string, ptyId: string) => void;
  updateExecution: (recipeName: string, status: RecipeExecutionStatus) => void;
  removeExecution: (recipeName: string) => void;
  reset: () => void;
}

export const useJustfileStore = create<JustfileStore>()((set) => ({
  executions: [],

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

  reset: () =>
    set({
      executions: [],
    }),
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { GlobalEnvVariable } from "@/types";

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /pass(?:wd)?$/i,
  /token/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /^aws[_-]/i,
  /^stripe[_-]/i,
  /^github[_-]?token/i,
  /^npm[_-]?token/i,
  /^openai/i,
  /^anthropic/i,
  /^supabase/i,
  /^redis/i,
  /^mongo/i,
  /^postgres/i,
  /^mysql/i,
];

export function detectSensitive(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

interface EnvStore {
  globalVariables: GlobalEnvVariable[];
  revealedKeys: Set<string>;

  addGlobalVariable: (key: string, value: string, isSensitive?: boolean) => void;
  updateGlobalVariable: (
    id: string,
    updates: Partial<Omit<GlobalEnvVariable, "id" | "createdAt">>
  ) => void;
  deleteGlobalVariable: (id: string) => void;

  revealValue: (key: string) => void;
  hideValue: (key: string) => void;
  hideAllValues: () => void;

  // Reset
  reset: () => void;
}

export const useEnvStore = create<EnvStore>()(
  persist(
    (set) => ({
      globalVariables: [],
      revealedKeys: new Set<string>(),

      addGlobalVariable: (key, value, isSensitive) => {
        const variable: GlobalEnvVariable = {
          id: uuid(),
          key,
          value,
          isSensitive: isSensitive ?? detectSensitive(key),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          globalVariables: [...state.globalVariables, variable],
        }));
      },

      updateGlobalVariable: (id, updates) => {
        set((state) => ({
          globalVariables: state.globalVariables.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v
          ),
        }));
      },

      deleteGlobalVariable: (id) => {
        set((state) => ({
          globalVariables: state.globalVariables.filter((v) => v.id !== id),
        }));
      },

      revealValue: (key) => {
        set((state) => {
          const newSet = new Set(state.revealedKeys);
          newSet.add(key);
          return { revealedKeys: newSet };
        });
      },

      hideValue: (key) => {
        set((state) => {
          const newSet = new Set(state.revealedKeys);
          newSet.delete(key);
          return { revealedKeys: newSet };
        });
      },

      hideAllValues: () => {
        set({ revealedKeys: new Set() });
      },

      reset: () => {
        set({
          globalVariables: [],
          revealedKeys: new Set(),
        });
      },
    }),
    {
      name: "wynter-code-env",
      partialize: (state) => ({
        globalVariables: state.globalVariables,
      }),
    }
  )
);

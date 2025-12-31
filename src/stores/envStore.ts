import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuid } from "uuid";
import type { GlobalEnvVariable } from "@/types";
import { isSensitiveKey } from "@/lib/sensitiveKeyDetection";

export { isSensitiveKey as detectSensitive };

interface EnvStore {
  globalVariables: GlobalEnvVariable[];
  revealedKeys: Set<string>;
  initialized: boolean;

  addGlobalVariable: (key: string, value: string, isSensitive?: boolean) => void;
  updateGlobalVariable: (
    id: string,
    updates: Partial<Omit<GlobalEnvVariable, "id" | "createdAt">>
  ) => void;
  deleteGlobalVariable: (id: string) => void;

  revealValue: (key: string) => void;
  hideValue: (key: string) => void;
  hideAllValues: () => void;

  initializeEnvVars: () => Promise<void>;

  reset: () => void;
}

export const useEnvStore = create<EnvStore>()(
  persist(
    (set, get) => ({
      globalVariables: [],
      revealedKeys: new Set<string>(),
      initialized: false,

      addGlobalVariable: (key, value, isSensitive) => {
        const variable: GlobalEnvVariable = {
          id: uuid(),
          key,
          value,
          isSensitive: isSensitive ?? isSensitiveKey(key),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Set in system environment
        invoke("set_system_env_var", { key, value }).catch((err) => {
          console.error("Failed to set system env var:", err);
        });

        set((state) => ({
          globalVariables: [...state.globalVariables, variable],
        }));
      },

      updateGlobalVariable: (id, updates) => {
        const state = get();
        const existing = state.globalVariables.find((v) => v.id === id);

        if (existing) {
          const newKey = updates.key ?? existing.key;
          const newValue = updates.value ?? existing.value;

          // If key changed, remove old key from system
          if (updates.key && updates.key !== existing.key) {
            invoke("remove_system_env_var", { key: existing.key }).catch((err) => {
              console.error("Failed to remove old system env var:", err);
            });
          }

          // Set new/updated key-value
          invoke("set_system_env_var", { key: newKey, value: newValue }).catch((err) => {
            console.error("Failed to set system env var:", err);
          });
        }

        set((state) => ({
          globalVariables: state.globalVariables.map((v) =>
            v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v
          ),
        }));
      },

      deleteGlobalVariable: (id) => {
        const state = get();
        const variable = state.globalVariables.find((v) => v.id === id);

        if (variable) {
          // Remove from system environment
          invoke("remove_system_env_var", { key: variable.key }).catch((err) => {
            console.error("Failed to remove system env var:", err);
          });
        }

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

      initializeEnvVars: async () => {
        const state = get();
        if (state.initialized) return;

        // Set all stored variables in the system environment
        for (const variable of state.globalVariables) {
          try {
            await invoke("set_system_env_var", {
              key: variable.key,
              value: variable.value
            });
          } catch (err) {
            console.error(`Failed to initialize env var ${variable.key}:`, err);
          }
        }

        set({ initialized: true });
      },

      reset: () => {
        // Remove all from system
        const state = get();
        for (const variable of state.globalVariables) {
          invoke("remove_system_env_var", { key: variable.key }).catch((err) => {
            console.error("Failed to remove system env var:", err);
          });
        }

        set({
          globalVariables: [],
          revealedKeys: new Set(),
          initialized: false,
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

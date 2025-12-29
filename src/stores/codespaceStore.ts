import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuid } from "uuid";
import type { CodespaceTab, CodespaceState } from "@/types/codespace";

interface PersistedTab {
  filePath: string;
  isActive: boolean;
}

interface CodespaceStore {
  codespaces: Map<string, CodespaceState>;

  getCodespaceState: (sessionId: string) => CodespaceState;
  openFile: (sessionId: string, filePath: string, line?: number) => Promise<void>;
  closeTab: (sessionId: string, tabId: string) => boolean;
  setActiveTab: (sessionId: string, tabId: string) => void;
  updateContent: (sessionId: string, tabId: string, content: string) => void;
  saveFile: (sessionId: string, tabId: string) => Promise<boolean>;
  saveAllFiles: (sessionId: string) => Promise<boolean>;
  hasUnsavedChanges: (sessionId: string) => boolean;
  revertFile: (sessionId: string, tabId: string) => void;
  reorderTabs: (sessionId: string, fromIndex: number, toIndex: number) => void;
  removeCodespace: (sessionId: string) => void;
  reloadFiles: (sessionId: string) => Promise<void>;
  clearPendingGoToLine: (sessionId: string) => void;
  reset: () => void;
}

const DEFAULT_STATE: CodespaceState = {
  tabs: [],
  activeTabId: null,
  pendingGoToLine: null,
};

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    rb: "ruby",
    php: "php",
    sql: "sql",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    toml: "toml",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    swift: "swift",
    kt: "kotlin",
    lua: "lua",
    r: "r",
    txt: "plaintext",
    gitignore: "ignore",
    dockerignore: "ignore",
    env: "dotenv",
  };
  return languageMap[ext || ""] || "plaintext";
}

export const useCodespaceStore = create<CodespaceStore>()(
  persist(
    (set, get) => ({
      codespaces: new Map(),

      getCodespaceState: (sessionId: string) => {
        const state = get().codespaces.get(sessionId);
        return state || DEFAULT_STATE;
      },

      openFile: async (sessionId: string, filePath: string, line?: number) => {
        const state = get().getCodespaceState(sessionId);

        // Check if file is already open
        const existingTab = state.tabs.find((t) => t.filePath === filePath);
        if (existingTab) {
          // Just activate it and set pending line if provided
          set((s) => {
            const codespaces = new Map(s.codespaces);
            const current = codespaces.get(sessionId) || DEFAULT_STATE;
            codespaces.set(sessionId, {
              ...current,
              activeTabId: existingTab.id,
              pendingGoToLine: line ?? null,
            });
            return { codespaces };
          });
          return;
        }

        // Read file content
        try {
          const content = await invoke<string>("read_file_content", { path: filePath });
          const fileName = filePath.split("/").pop() || filePath;
          const language = getLanguageFromPath(filePath);

          const newTab: CodespaceTab = {
            id: uuid(),
            filePath,
            fileName,
            content,
            originalContent: content,
            isDirty: false,
            language,
          };

          set((s) => {
            const codespaces = new Map(s.codespaces);
            const current = codespaces.get(sessionId) || DEFAULT_STATE;
            codespaces.set(sessionId, {
              tabs: [...current.tabs, newTab],
              activeTabId: newTab.id,
              pendingGoToLine: line ?? null,
            });
            return { codespaces };
          });
        } catch (err) {
          console.error("Failed to open file:", err);
          throw err;
        }
      },

      closeTab: (sessionId: string, tabId: string) => {
        const state = get().getCodespaceState(sessionId);
        const tab = state.tabs.find((t) => t.id === tabId);

        if (tab?.isDirty) {
          return false; // Signal that confirmation is needed
        }

        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId) || DEFAULT_STATE;
          const newTabs = current.tabs.filter((t) => t.id !== tabId);

          // Update active tab if we're closing the active one
          let newActiveTabId = current.activeTabId;
          if (current.activeTabId === tabId) {
            const closedIndex = current.tabs.findIndex((t) => t.id === tabId);
            if (newTabs.length > 0) {
              // Try to activate the tab to the right, or the one to the left
              newActiveTabId = newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id || null;
            } else {
              newActiveTabId = null;
            }
          }

          codespaces.set(sessionId, {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            pendingGoToLine: null,
          });
          return { codespaces };
        });

        return true;
      },

      setActiveTab: (sessionId: string, tabId: string) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId) || DEFAULT_STATE;
          codespaces.set(sessionId, { ...current, activeTabId: tabId });
          return { codespaces };
        });
      },

      updateContent: (sessionId: string, tabId: string, content: string) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId) || DEFAULT_STATE;
          const newTabs = current.tabs.map((t) => {
            if (t.id === tabId) {
              const isDirty = content !== t.originalContent;
              return { ...t, content, isDirty };
            }
            return t;
          });
          codespaces.set(sessionId, { ...current, tabs: newTabs });
          return { codespaces };
        });
      },

      saveFile: async (sessionId: string, tabId: string) => {
        const state = get().getCodespaceState(sessionId);
        const tab = state.tabs.find((t) => t.id === tabId);

        if (!tab) return false;

        try {
          await invoke("write_file_content", { path: tab.filePath, content: tab.content });

          set((s) => {
            const codespaces = new Map(s.codespaces);
            const current = codespaces.get(sessionId) || DEFAULT_STATE;
            const newTabs = current.tabs.map((t) => {
              if (t.id === tabId) {
                return { ...t, originalContent: t.content, isDirty: false };
              }
              return t;
            });
            codespaces.set(sessionId, { ...current, tabs: newTabs });
            return { codespaces };
          });

          return true;
        } catch (err) {
          console.error("Failed to save file:", err);
          return false;
        }
      },

      saveAllFiles: async (sessionId: string) => {
        const state = get().getCodespaceState(sessionId);
        const dirtyTabs = state.tabs.filter((t) => t.isDirty);

        const results = await Promise.all(
          dirtyTabs.map((tab) => get().saveFile(sessionId, tab.id))
        );

        return results.every(Boolean);
      },

      hasUnsavedChanges: (sessionId: string) => {
        const state = get().getCodespaceState(sessionId);
        return state.tabs.some((t) => t.isDirty);
      },

      revertFile: (sessionId: string, tabId: string) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId) || DEFAULT_STATE;
          const newTabs = current.tabs.map((t) => {
            if (t.id === tabId) {
              return { ...t, content: t.originalContent, isDirty: false };
            }
            return t;
          });
          codespaces.set(sessionId, { ...current, tabs: newTabs });
          return { codespaces };
        });
      },

      reorderTabs: (sessionId: string, fromIndex: number, toIndex: number) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId) || DEFAULT_STATE;
          const newTabs = [...current.tabs];
          const [removed] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, removed);
          codespaces.set(sessionId, { ...current, tabs: newTabs });
          return { codespaces };
        });
      },

      removeCodespace: (sessionId: string) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          codespaces.delete(sessionId);
          return { codespaces };
        });
      },

      reloadFiles: async (sessionId: string) => {
        const state = get().getCodespaceState(sessionId);
        for (const tab of state.tabs) {
          try {
            const content = await invoke<string>("read_file_content", { path: tab.filePath });
            set((s) => {
              const codespaces = new Map(s.codespaces);
              const current = codespaces.get(sessionId) || DEFAULT_STATE;
              const newTabs = current.tabs.map((t) => {
                if (t.id === tab.id) {
                  return { ...t, content, originalContent: content, isDirty: false };
                }
                return t;
              });
              codespaces.set(sessionId, { ...current, tabs: newTabs });
              return { codespaces };
            });
          } catch (err) {
            console.error("Failed to reload file:", tab.filePath, err);
          }
        }
      },

      clearPendingGoToLine: (sessionId: string) => {
        set((s) => {
          const codespaces = new Map(s.codespaces);
          const current = codespaces.get(sessionId);
          if (current) {
            codespaces.set(sessionId, { ...current, pendingGoToLine: null });
          }
          return { codespaces };
        });
      },

      reset: () => {
        set({ codespaces: new Map() });
      },
    }),
    {
      name: "codespace-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);

          // Restore only file paths, not content (will be reloaded)
          const codespaces = new Map<string, CodespaceState>();
          const entries = parsed.state.codespaces || [];

          for (const [sessionId, persistedTabs] of entries) {
            if (Array.isArray(persistedTabs) && persistedTabs.length > 0) {
              // Store tabs with placeholder content - will be reloaded
              const tabs: CodespaceTab[] = persistedTabs.map((pt: PersistedTab) => ({
                id: uuid(),
                filePath: pt.filePath,
                fileName: pt.filePath.split("/").pop() || pt.filePath,
                content: "",
                originalContent: "",
                isDirty: false,
                language: getLanguageFromPath(pt.filePath),
              }));

              const activeIndex = persistedTabs.findIndex((pt: PersistedTab) => pt.isActive);
              codespaces.set(sessionId, {
                tabs,
                activeTabId: activeIndex >= 0 ? tabs[activeIndex].id : tabs[0]?.id || null,
                pendingGoToLine: null,
              });
            }
          }

          return {
            ...parsed,
            state: { codespaces },
          };
        },
        setItem: (name, value) => {
          // Only persist file paths and active state, not content
          const entries = Array.from(value.state.codespaces.entries()).map(
            ([sessionId, state]: [string, CodespaceState]) => [
              sessionId,
              state.tabs.map((t) => ({
                filePath: t.filePath,
                isActive: t.id === state.activeTabId,
              })),
            ]
          );

          const serialized = {
            ...value,
            state: { codespaces: entries },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

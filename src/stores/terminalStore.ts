import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TERMINAL_HEIGHT } from "@/lib/constants";

interface TerminalState {
  isOpen: boolean;
  isMaximized: boolean;
  height: number;
  ptyId: string | null;
}

interface TerminalStore {
  terminals: Map<string, TerminalState>;
  sessionPtyIds: Map<string, string>;
  queuedCommands: Map<string, string>; // sessionId -> command to execute when PTY ready

  getTerminalState: (projectId: string) => TerminalState;
  toggleTerminal: (projectId: string) => void;
  openTerminal: (projectId: string) => void;
  closeTerminal: (projectId: string) => void;
  setHeight: (projectId: string, height: number) => void;
  setPtyId: (projectId: string, ptyId: string | null) => void;
  toggleMaximize: (projectId: string) => void;
  setMaximized: (projectId: string, isMaximized: boolean) => void;
  getSessionPtyId: (sessionId: string) => string | null;
  setSessionPtyId: (sessionId: string, ptyId: string) => void;
  queueCommand: (sessionId: string, command: string) => void;
  getQueuedCommand: (sessionId: string) => string | null;
  clearQueuedCommand: (sessionId: string) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_STATE: TerminalState = {
  isOpen: false,
  isMaximized: false,
  height: DEFAULT_TERMINAL_HEIGHT,
  ptyId: null,
};

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      terminals: new Map(),
      sessionPtyIds: new Map(),
      queuedCommands: new Map(),

      getTerminalState: (projectId: string) => {
        const state = get().terminals.get(projectId);
        return state || DEFAULT_STATE;
      },

      toggleTerminal: (projectId: string) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, isOpen: !current.isOpen });
          return { terminals };
        });
      },

      openTerminal: (projectId: string) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, isOpen: true });
          return { terminals };
        });
      },

      closeTerminal: (projectId: string) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          // Clear ptyId when closing so reopening creates a fresh PTY
          terminals.set(projectId, { ...current, isOpen: false, ptyId: null });
          return { terminals };
        });
      },

      setHeight: (projectId: string, height: number) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, height });
          return { terminals };
        });
      },

      setPtyId: (projectId: string, ptyId: string | null) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, ptyId });
          return { terminals };
        });
      },

      toggleMaximize: (projectId: string) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, isMaximized: !current.isMaximized });
          return { terminals };
        });
      },

      setMaximized: (projectId: string, isMaximized: boolean) => {
        set((state) => {
          const terminals = new Map(state.terminals);
          const current = terminals.get(projectId) || DEFAULT_STATE;
          terminals.set(projectId, { ...current, isMaximized });
          return { terminals };
        });
      },

      getSessionPtyId: (sessionId: string) => {
        return get().sessionPtyIds.get(sessionId) || null;
      },

      setSessionPtyId: (sessionId: string, ptyId: string) => {
        set((state) => {
          const sessionPtyIds = new Map(state.sessionPtyIds);
          sessionPtyIds.set(sessionId, ptyId);
          return { sessionPtyIds };
        });
      },

      queueCommand: (sessionId: string, command: string) => {
        set((state) => {
          const queuedCommands = new Map(state.queuedCommands);
          queuedCommands.set(sessionId, command);
          return { queuedCommands };
        });
      },

      getQueuedCommand: (sessionId: string) => {
        return get().queuedCommands.get(sessionId) || null;
      },

      clearQueuedCommand: (sessionId: string) => {
        set((state) => {
          const queuedCommands = new Map(state.queuedCommands);
          queuedCommands.delete(sessionId);
          return { queuedCommands };
        });
      },

      reset: () => {
        set({
          terminals: new Map(),
          sessionPtyIds: new Map(),
          queuedCommands: new Map(),
        });
      },
    }),
    {
      name: "terminal-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Clear ptyIds on load - they're ephemeral and won't be valid after restart
          // Also reset isMaximized to false on load
          const terminals = new Map(
            (parsed.state.terminals || []).map(([id, state]: [string, TerminalState]) => [
              id,
              { ...state, ptyId: null, isMaximized: false },
            ])
          );
          return {
            ...parsed,
            state: {
              ...parsed.state,
              terminals,
              // Don't restore session ptyIds or queued commands - they're ephemeral
              sessionPtyIds: new Map(),
              queuedCommands: new Map(),
            },
          };
        },
        setItem: (name, value) => {
          // Don't persist ptyIds - they're ephemeral
          const terminals = Array.from(value.state.terminals.entries()).map(
            ([id, state]: [string, TerminalState]) => [id, { ...state, ptyId: null }]
          );
          const serialized = {
            ...value,
            state: {
              ...value.state,
              terminals,
              // Don't persist session ptyIds or queued commands
              sessionPtyIds: [],
              queuedCommands: [],
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

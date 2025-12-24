import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StorybookStatus =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "error";

export interface StorybookServer {
  serverId: string;
  projectPath: string;
  port: number;
  url: string;
  status: StorybookStatus;
  error: string | null;
  startedAt: number;
}

interface StorybookStore {
  servers: StorybookServer[];
  preferredPort: number;

  setServers: (servers: StorybookServer[]) => void;
  addServer: (server: StorybookServer) => void;
  updateServer: (serverId: string, updates: Partial<StorybookServer>) => void;
  removeServer: (serverId: string) => void;
  setPreferredPort: (port: number) => void;
  getServerForProject: (projectPath: string) => StorybookServer | undefined;

  // Reset
  reset: () => void;
}

export const useStorybookStore = create<StorybookStore>()(
  persist(
    (set, get) => ({
      servers: [],
      preferredPort: 6006,

      setServers: (servers) => set({ servers }),

      addServer: (server) =>
        set((state) => ({
          servers: [...state.servers, server],
        })),

      updateServer: (serverId, updates) =>
        set((state) => ({
          servers: state.servers.map((srv) =>
            srv.serverId === serverId ? { ...srv, ...updates } : srv
          ),
        })),

      removeServer: (serverId) =>
        set((state) => ({
          servers: state.servers.filter((srv) => srv.serverId !== serverId),
        })),

      setPreferredPort: (port) => set({ preferredPort: port }),

      getServerForProject: (projectPath) => {
        return get().servers.find((s) => s.projectPath === projectPath);
      },

      reset: () => {
        set({
          servers: [],
          preferredPort: 6006,
        });
      },
    }),
    {
      name: "wynter-code-storybook",
      partialize: (state) => ({
        preferredPort: state.preferredPort,
      }),
    }
  )
);

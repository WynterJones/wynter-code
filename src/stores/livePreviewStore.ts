import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PreviewServerInfo,
  ProjectDetectionResult,
} from "@/types/livepreview";
import { LIVE_PREVIEW_DEFAULT_PORT } from "@/lib/constants";

interface LivePreviewStore {
  servers: PreviewServerInfo[];
  detectionResult: ProjectDetectionResult | null;
  preferredPort: number;
  autoOpenBrowser: boolean;
  showQRByDefault: boolean;
  expandedServerId: string | null;
  previewFolders: Record<string, string>; // projectId -> folder path

  setServers: (servers: PreviewServerInfo[]) => void;
  addServer: (server: PreviewServerInfo) => void;
  updateServer: (
    serverId: string,
    updates: Partial<PreviewServerInfo>
  ) => void;
  removeServer: (serverId: string) => void;
  setDetectionResult: (result: ProjectDetectionResult | null) => void;
  setPreferredPort: (port: number) => void;
  setAutoOpenBrowser: (value: boolean) => void;
  setShowQRByDefault: (value: boolean) => void;
  setExpandedServerId: (serverId: string | null) => void;
  setPreviewFolder: (projectId: string, folder: string | null) => void;
  getPreviewFolder: (projectId: string) => string | null;

  // Reset
  reset: () => void;
}

export const useLivePreviewStore = create<LivePreviewStore>()(
  persist(
    (set, get) => ({
      servers: [],
      detectionResult: null,
      preferredPort: LIVE_PREVIEW_DEFAULT_PORT,
      autoOpenBrowser: true,
      showQRByDefault: false,
      expandedServerId: null,
      previewFolders: {},

      setServers: (servers: PreviewServerInfo[]) => {
        set({ servers });
      },

      addServer: (server: PreviewServerInfo) => {
        set((state) => ({
          servers: [...state.servers, server],
        }));
      },

      updateServer: (
        serverId: string,
        updates: Partial<PreviewServerInfo>
      ) => {
        set((state) => ({
          servers: state.servers.map((srv) =>
            srv.serverId === serverId ? { ...srv, ...updates } : srv
          ),
        }));
      },

      removeServer: (serverId: string) => {
        set((state) => ({
          servers: state.servers.filter((srv) => srv.serverId !== serverId),
          expandedServerId:
            state.expandedServerId === serverId
              ? null
              : state.expandedServerId,
        }));
      },

      setDetectionResult: (result: ProjectDetectionResult | null) => {
        set({ detectionResult: result });
      },

      setPreferredPort: (port: number) => {
        set({ preferredPort: port });
      },

      setAutoOpenBrowser: (value: boolean) => {
        set({ autoOpenBrowser: value });
      },

      setShowQRByDefault: (value: boolean) => {
        set({ showQRByDefault: value });
      },

      setExpandedServerId: (serverId: string | null) => {
        set({ expandedServerId: serverId });
      },

      setPreviewFolder: (projectId: string, folder: string | null) => {
        set((state) => {
          const newFolders = { ...state.previewFolders };
          if (folder) {
            newFolders[projectId] = folder;
          } else {
            delete newFolders[projectId];
          }
          return { previewFolders: newFolders };
        });
      },

      getPreviewFolder: (projectId: string) => {
        return get().previewFolders[projectId] ?? null;
      },

      reset: () => {
        set({
          servers: [],
          detectionResult: null,
          preferredPort: LIVE_PREVIEW_DEFAULT_PORT,
          autoOpenBrowser: true,
          showQRByDefault: false,
          expandedServerId: null,
          previewFolders: {},
        });
      },
    }),
    {
      name: "wynter-code-live-preview",
      partialize: (state) => ({
        preferredPort: state.preferredPort,
        autoOpenBrowser: state.autoOpenBrowser,
        showQRByDefault: state.showQRByDefault,
        previewFolders: state.previewFolders,
      }),
    }
  )
);

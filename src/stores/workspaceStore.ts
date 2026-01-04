import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Workspace,
  WorkspaceAvatar,
} from "@/types/workspace";
import { createWorkspace, createWorkspaceWithId, createDefaultAvatar } from "@/types/workspace";
import type { Project } from "@/types";

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  _migrated: boolean; // Track if we've migrated from old projectStore

  // Workspace actions
  addWorkspace: (name: string, color?: string) => string;
  addWorkspaceWithId: (id: string, name: string, color?: string) => void; // For mobile API
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  setActiveWorkspace: (id: string) => void;
  updateWorkspaceAvatar: (id: string, avatar: Partial<WorkspaceAvatar>) => void;

  // Workspace reordering
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;

  // Project management within workspaces
  addProjectToWorkspace: (workspaceId: string, projectId: string) => void;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => void;
  reorderProjectsInWorkspace: (
    workspaceId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  setLastActiveProject: (workspaceId: string, projectId: string | null) => void;

  // Helpers
  getWorkspace: (id: string) => Workspace | undefined;
  getActiveWorkspace: () => Workspace | undefined;
  getProjectIdsForWorkspace: (workspaceId: string) => string[];

  // Migration
  migrateFromProjectStore: (projects: Project[]) => void;

  // Reset
  reset: () => void;
}

const DEFAULT_WORKSPACE_NAME = "Default";

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      _migrated: false,

      addWorkspace: (name: string, color?: string) => {
        const workspace = createWorkspace(name, color);
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: state.activeWorkspaceId || workspace.id,
        }));
        return workspace.id;
      },

      addWorkspaceWithId: (id: string, name: string, color?: string) => {
        // Check if workspace with this ID already exists to prevent duplicates
        const existing = get().workspaces.find((w) => w.id === id);
        if (existing) {
          return;
        }
        const workspace = createWorkspaceWithId(id, name, color);
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: state.activeWorkspaceId || workspace.id,
        }));
      },

      removeWorkspace: (id: string) => {
        set((state) => {
          const newWorkspaces = state.workspaces.filter((w) => w.id !== id);

          // If we're deleting the active workspace, switch to first available
          const newActiveId =
            state.activeWorkspaceId === id
              ? newWorkspaces[0]?.id || null
              : state.activeWorkspaceId;

          return {
            workspaces: newWorkspaces,
            activeWorkspaceId: newActiveId,
          };
        });
      },

      updateWorkspace: (id: string, updates: Partial<Workspace>) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      setActiveWorkspace: (id: string) => {
        set((state) => ({
          activeWorkspaceId: id,
          workspaces: state.workspaces.map((w) =>
            w.id === id ? { ...w, lastOpenedAt: new Date() } : w
          ),
        }));
      },

      updateWorkspaceAvatar: (id: string, avatarUpdates: Partial<WorkspaceAvatar>) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === id
              ? { ...w, avatar: { ...w.avatar, ...avatarUpdates } }
              : w
          ),
        }));
      },

      reorderWorkspaces: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newWorkspaces = [...state.workspaces];
          const [removed] = newWorkspaces.splice(fromIndex, 1);
          newWorkspaces.splice(toIndex, 0, removed);
          return { workspaces: newWorkspaces };
        });
      },

      addProjectToWorkspace: (workspaceId: string, projectId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId && !w.projectIds.includes(projectId)
              ? { ...w, projectIds: [...w.projectIds, projectId] }
              : w
          ),
        }));
      },

      removeProjectFromWorkspace: (workspaceId: string, projectId: string) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;

            const newProjectIds = w.projectIds.filter((id) => id !== projectId);
            const newLastActiveId =
              w.lastActiveProjectId === projectId
                ? newProjectIds[0] || null
                : w.lastActiveProjectId;

            return {
              ...w,
              projectIds: newProjectIds,
              lastActiveProjectId: newLastActiveId,
            };
          }),
        }));
      },

      reorderProjectsInWorkspace: (
        workspaceId: string,
        fromIndex: number,
        toIndex: number
      ) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => {
            if (w.id !== workspaceId) return w;

            const newProjectIds = [...w.projectIds];
            const [removed] = newProjectIds.splice(fromIndex, 1);
            newProjectIds.splice(toIndex, 0, removed);

            return { ...w, projectIds: newProjectIds };
          }),
        }));
      },

      setLastActiveProject: (workspaceId: string, projectId: string | null) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.id === workspaceId ? { ...w, lastActiveProjectId: projectId } : w
          ),
        }));
      },

      getWorkspace: (id: string) => {
        return get().workspaces.find((w) => w.id === id);
      },

      getActiveWorkspace: () => {
        const { workspaces, activeWorkspaceId } = get();
        return workspaces.find((w) => w.id === activeWorkspaceId);
      },

      getProjectIdsForWorkspace: (workspaceId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        return workspace?.projectIds || [];
      },

      migrateFromProjectStore: (projects: Project[]) => {
        // Only migrate once
        if (get()._migrated || get().workspaces.length > 0) {
          set({ _migrated: true });
          return;
        }

        // Create default workspace with all existing projects
        const defaultWorkspace: Workspace = {
          id: crypto.randomUUID(),
          name: DEFAULT_WORKSPACE_NAME,
          color: "#cba6f7",
          avatar: createDefaultAvatar(),
          projectIds: projects.map((p) => p.id),
          lastActiveProjectId: projects[0]?.id || null,
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        };

        set({
          workspaces: [defaultWorkspace],
          activeWorkspaceId: defaultWorkspace.id,
          _migrated: true,
        });
      },

      reset: () => {
        set({
          workspaces: [],
          activeWorkspaceId: null,
          _migrated: false,
        });
      },
    }),
    {
      name: "wynter-code-workspaces",
      // Handle date serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Rehydrate dates
          if (data.state?.workspaces) {
            data.state.workspaces = data.state.workspaces.map(
              (w: Workspace) => ({
                ...w,
                createdAt: new Date(w.createdAt),
                lastOpenedAt: w.lastOpenedAt ? new Date(w.lastOpenedAt) : null,
              })
            );
          }
          return data;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

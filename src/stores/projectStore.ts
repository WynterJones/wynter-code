import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { Project } from "@/types";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;

  addProject: (path: string) => void;
  removeProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  updateProjectName: (id: string, name: string) => void;
  updateProjectColor: (id: string, color: string) => void;
  updateProjectIcon: (id: string, icon: string) => void;
  toggleMinimized: (id: string) => void;
  reorderProjects: (fromIndex: number, toIndex: number) => void;
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      addProject: (path: string) => {
        const existing = get().projects.find((p) => p.path === path);
        if (existing) {
          set({ activeProjectId: existing.id });
          return;
        }

        const name = path.split("/").pop() || "Project";
        const project: Project = {
          id: uuid(),
          name,
          path,
          lastOpenedAt: new Date(),
          createdAt: new Date(),
        };

        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        }));
      },

      removeProject: (id: string) => {
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== id);
          const newActiveId =
            state.activeProjectId === id
              ? newProjects[0]?.id || null
              : state.activeProjectId;

          return {
            projects: newProjects,
            activeProjectId: newActiveId,
          };
        });
      },

      setActiveProject: (id: string) => {
        set((state) => ({
          activeProjectId: id,
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, lastOpenedAt: new Date() } : p
          ),
        }));
      },

      updateProjectName: (id: string, name: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        }));
      },

      updateProjectColor: (id: string, color: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, color: color || undefined } : p
          ),
        }));
      },

      updateProjectIcon: (id: string, icon: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, icon: icon || undefined } : p
          ),
        }));
      },

      toggleMinimized: (id: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, minimized: !p.minimized } : p
          ),
        }));
      },

      reorderProjects: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newProjects = [...state.projects];
          const [removed] = newProjects.splice(fromIndex, 1);
          newProjects.splice(toIndex, 0, removed);
          return { projects: newProjects };
        });
      },

      getProject: (id: string) => {
        return get().projects.find((p) => p.id === id);
      },
    }),
    {
      name: "wynter-code-projects",
    }
  )
);

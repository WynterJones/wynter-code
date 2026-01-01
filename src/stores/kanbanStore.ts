import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  KanbanTask,
  KanbanBoard,
  KanbanStatus,
  KanbanPriority,
} from "@/types/kanban";

interface KanbanStore {
  // Per-workspace board data
  boards: Map<string, KanbanBoard>;

  // Actions
  getBoard: (workspaceId: string) => KanbanBoard;
  getTasks: (workspaceId: string, status?: KanbanStatus) => KanbanTask[];
  getTask: (workspaceId: string, taskId: string) => KanbanTask | undefined;
  createTask: (
    workspaceId: string,
    title: string,
    priority: KanbanPriority,
    description?: string
  ) => string;
  createTaskWithId: (
    workspaceId: string,
    id: string,
    title: string,
    priority: KanbanPriority,
    description?: string
  ) => void;
  updateTask: (
    workspaceId: string,
    taskId: string,
    updates: Partial<Omit<KanbanTask, "id" | "createdAt">>
  ) => void;
  deleteTask: (workspaceId: string, taskId: string) => void;
  moveTask: (
    workspaceId: string,
    taskId: string,
    newStatus: KanbanStatus,
    newOrder?: number
  ) => void;
  reorderTasks: (workspaceId: string, status: KanbanStatus, taskIds: string[]) => void;
  toggleLock: (workspaceId: string, taskId: string) => void;

  // Reset
  reset: () => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
      boards: new Map(),

      getBoard: (workspaceId) => {
        return get().boards.get(workspaceId) || { tasks: [] };
      },

      getTasks: (workspaceId, status) => {
        const board = get().getBoard(workspaceId);
        const tasks = status
          ? board.tasks.filter((t) => t.status === status)
          : board.tasks;
        return tasks.sort((a, b) => a.order - b.order);
      },

      getTask: (workspaceId, taskId) => {
        const board = get().getBoard(workspaceId);
        return board.tasks.find((t) => t.id === taskId);
      },

      createTask: (workspaceId, title, priority, description) => {
        const id = crypto.randomUUID();
        const board = get().getBoard(workspaceId);
        const backlogTasks = board.tasks.filter((t) => t.status === "backlog");
        const maxOrder =
          backlogTasks.length > 0
            ? Math.max(...backlogTasks.map((t) => t.order)) + 1
            : 0;

        const newTask: KanbanTask = {
          id,
          title,
          description,
          status: "backlog",
          priority,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: maxOrder,
        };

        set((state) => {
          const newBoards = new Map(state.boards);
          const existingBoard = newBoards.get(workspaceId) || { tasks: [] };
          newBoards.set(workspaceId, {
            tasks: [...existingBoard.tasks, newTask],
          });
          return { boards: newBoards };
        });

        return id;
      },

      createTaskWithId: (workspaceId, id, title, priority, description) => {
        const board = get().getBoard(workspaceId);

        // Check if task with this ID already exists to prevent duplicates
        if (board.tasks.some((t) => t.id === id)) {
          console.log(`[kanbanStore] Task ${id} already exists, skipping`);
          return;
        }

        const backlogTasks = board.tasks.filter((t) => t.status === "backlog");
        const maxOrder =
          backlogTasks.length > 0
            ? Math.max(...backlogTasks.map((t) => t.order)) + 1
            : 0;

        const newTask: KanbanTask = {
          id,
          title,
          description,
          status: "backlog",
          priority,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: maxOrder,
        };

        set((state) => {
          const newBoards = new Map(state.boards);
          const existingBoard = newBoards.get(workspaceId) || { tasks: [] };
          newBoards.set(workspaceId, {
            tasks: [...existingBoard.tasks, newTask],
          });
          return { boards: newBoards };
        });
      },

      updateTask: (workspaceId, taskId, updates) => {
        set((state) => {
          const newBoards = new Map(state.boards);
          const board = newBoards.get(workspaceId);
          if (!board) return state;

          newBoards.set(workspaceId, {
            tasks: board.tasks.map((t) =>
              t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
            ),
          });
          return { boards: newBoards };
        });
      },

      deleteTask: (workspaceId, taskId) => {
        set((state) => {
          const newBoards = new Map(state.boards);
          const board = newBoards.get(workspaceId);
          if (!board) return state;

          newBoards.set(workspaceId, {
            tasks: board.tasks.filter((t) => t.id !== taskId),
          });
          return { boards: newBoards };
        });
      },

      moveTask: (workspaceId, taskId, newStatus, newOrder) => {
        set((state) => {
          const newBoards = new Map(state.boards);
          const board = newBoards.get(workspaceId);
          if (!board) return state;

          const task = board.tasks.find((t) => t.id === taskId);
          if (!task) return state;

          // Calculate order if not provided
          const targetColumnTasks = board.tasks.filter(
            (t) => t.status === newStatus && t.id !== taskId
          );
          const order =
            newOrder ??
            (targetColumnTasks.length > 0
              ? Math.max(...targetColumnTasks.map((t) => t.order)) + 1
              : 0);

          newBoards.set(workspaceId, {
            tasks: board.tasks.map((t) =>
              t.id === taskId
                ? { ...t, status: newStatus, order, updatedAt: Date.now() }
                : t
            ),
          });
          return { boards: newBoards };
        });
      },

      reorderTasks: (workspaceId, status, taskIds) => {
        set((state) => {
          const newBoards = new Map(state.boards);
          const board = newBoards.get(workspaceId);
          if (!board) return state;

          newBoards.set(workspaceId, {
            tasks: board.tasks.map((t) => {
              if (t.status === status) {
                const newOrder = taskIds.indexOf(t.id);
                return newOrder !== -1 ? { ...t, order: newOrder } : t;
              }
              return t;
            }),
          });
          return { boards: newBoards };
        });
      },

      toggleLock: (workspaceId, taskId) => {
        set((state) => {
          const newBoards = new Map(state.boards);
          const board = newBoards.get(workspaceId);
          if (!board) return state;

          newBoards.set(workspaceId, {
            tasks: board.tasks.map((t) =>
              t.id === taskId ? { ...t, locked: !t.locked, updatedAt: Date.now() } : t
            ),
          });
          return { boards: newBoards };
        });
      },

      reset: () => {
        set({ boards: new Map() });
      },
    }),
    {
      name: "wynter-code-kanban",
      partialize: (state) => ({
        boards: Array.from(state.boards.entries()),
      }),
      merge: (persisted: unknown, current) => {
        const data = persisted as {
          boards?: [string, KanbanBoard][];
        } | null;

        return {
          ...current,
          boards: new Map(data?.boards || []),
        };
      },
    }
  )
);

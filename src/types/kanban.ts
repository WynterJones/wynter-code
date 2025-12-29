export type KanbanStatus = "backlog" | "doing" | "mvp" | "polished";
export type KanbanPriority = 0 | 1 | 2 | 3 | 4;

export const KANBAN_STATUSES: KanbanStatus[] = ["backlog", "doing", "mvp", "polished"];

export const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  0: "Urgent",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "None",
};

export const PRIORITY_COLORS: Record<KanbanPriority, string> = {
  0: "border-l-red-500",
  1: "border-l-orange-500",
  2: "border-l-yellow-500",
  3: "border-l-blue-500",
  4: "border-l-neutral-500",
};

export const PRIORITY_DOT_COLORS: Record<KanbanPriority, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-yellow-500",
  3: "bg-blue-500",
  4: "bg-neutral-500",
};

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  createdAt: number;
  updatedAt: number;
  order: number;
}

export interface KanbanBoard {
  tasks: KanbanTask[];
}

export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  color: string;
  emptyMessage: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", color: "border-blue-500/50", emptyMessage: "No tasks in backlog" },
  { id: "doing", title: "Doing", color: "border-amber-500/50", emptyMessage: "Nothing in progress" },
  { id: "mvp", title: "MVP", color: "border-green-500/50", emptyMessage: "No MVP items" },
  { id: "polished", title: "Polished", color: "border-purple-500/50", emptyMessage: "Nothing polished yet" },
];

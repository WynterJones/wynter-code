export type BeadsStatus = "open" | "in_progress" | "blocked" | "closed";
export type BeadsIssueType = "task" | "feature" | "bug" | "epic";

export interface BeadsDependency {
  issue_id: string;
  depends_on_id: string;
  type: "parent-child" | "blocks" | "relates_to";
  created_at: string;
  created_by: string;
  metadata: string;
}

export interface BeadsIssue {
  id: string;
  title: string;
  status: BeadsStatus;
  priority: number;
  issue_type: BeadsIssueType;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: string;
  assignee?: string;
  description?: string;
  labels?: string[];
  dependencies?: BeadsDependency[];
  phase?: number; // For concurrent auto-build ordering (1 = first, 2 = second, etc.)
  parent_id?: string; // For hierarchical issues (epics)
}

export interface BeadsUpdate {
  title?: string;
  status?: BeadsStatus;
  priority?: number;
  assignee?: string;
  description?: string;
  phase?: number;
}

export interface BeadsStats {
  total: number;
  open: number;
  in_progress: number;
  blocked: number;
  closed: number;
  ready: number;
}

export const STATUS_COLORS: Record<BeadsStatus, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  closed: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
};

export const TYPE_COLORS: Record<BeadsIssueType, string> = {
  task: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  feature: "bg-green-500/20 text-green-400 border-green-500/30",
  bug: "bg-red-500/20 text-red-400 border-red-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "Critical",
  1: "High",
  2: "Medium",
  3: "Low",
  4: "Trivial",
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: "text-red-400",
  1: "text-orange-400",
  2: "text-yellow-400",
  3: "text-blue-400",
  4: "text-neutral-400",
};

// Hex colors for PixiJS vehicle tinting (Farmwork Tycoon visualization)
export const PRIORITY_HEX_COLORS: Record<number, number> = {
  0: 0xf87171, // red-400 - Critical
  1: 0xfb923c, // orange-400 - High
  2: 0xfacc15, // yellow-400 - Medium
  3: 0x60a5fa, // blue-400 - Low
  4: 0xa3a3a3, // neutral-400 - Trivial
};

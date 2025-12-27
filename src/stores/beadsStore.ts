import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  BeadsIssue,
  BeadsStats,
  BeadsIssueType,
  BeadsUpdate,
} from "@/types/beads";

interface BeadsState {
  issues: BeadsIssue[];
  stats: BeadsStats | null;
  loading: boolean;
  error: string | null;
  projectPath: string | null;

  setProjectPath: (path: string | null) => void;
  fetchIssues: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createIssue: (
    title: string,
    issueType: BeadsIssueType,
    priority: number,
    description?: string
  ) => Promise<string>;
  updateIssue: (id: string, updates: BeadsUpdate) => Promise<void>;
  closeIssue: (id: string, reason: string) => Promise<void>;
  reopenIssue: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBeadsStore = create<BeadsState>((set, get) => ({
  issues: [],
  stats: null,
  loading: false,
  error: null,
  projectPath: null,

  setProjectPath: (path) => {
    set({ projectPath: path, issues: [], stats: null, error: null });
  },

  fetchIssues: async () => {
    const { projectPath } = get();
    if (!projectPath) return;

    set({ loading: true, error: null });
    try {
      const issues = await invoke<BeadsIssue[]>("beads_list", {
        projectPath,
      });
      set({ issues, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  fetchStats: async () => {
    const { projectPath } = get();
    if (!projectPath) return;

    try {
      const stats = await invoke<BeadsStats>("beads_stats", {
        projectPath,
      });
      set({ stats });
    } catch (err) {
      console.error("Failed to fetch beads stats:", err);
    }
  },

  createIssue: async (title, issueType, priority, description) => {
    const { projectPath, fetchIssues } = get();
    if (!projectPath) throw new Error("No project path set");

    set({ loading: true, error: null });
    try {
      const id = await invoke<string>("beads_create", {
        projectPath,
        title,
        issueType,
        priority,
        description: description || null,
      });
      await fetchIssues();
      return id;
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  updateIssue: async (id, updates) => {
    const { projectPath, fetchIssues } = get();
    if (!projectPath) throw new Error("No project path set");

    set({ loading: true, error: null });
    try {
      // Handle phase updates separately (custom field not in bd CLI)
      if ("phase" in updates) {
        await invoke("beads_update_phase", {
          projectPath,
          id,
          phase: updates.phase ?? null,
        });
        // Remove phase from updates to avoid bd CLI error
        const { phase: _, ...restUpdates } = updates;
        if (Object.keys(restUpdates).length > 0) {
          await invoke("beads_update", {
            projectPath,
            id,
            updates: restUpdates,
          });
        }
      } else {
        await invoke("beads_update", {
          projectPath,
          id,
          updates,
        });
      }
      await fetchIssues();
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  closeIssue: async (id, reason) => {
    const { projectPath, fetchIssues } = get();
    if (!projectPath) throw new Error("No project path set");

    set({ loading: true, error: null });
    try {
      await invoke("beads_close", {
        projectPath,
        id,
        reason,
      });
      await fetchIssues();
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  reopenIssue: async (id) => {
    const { projectPath, fetchIssues } = get();
    if (!projectPath) throw new Error("No project path set");

    set({ loading: true, error: null });
    try {
      await invoke("beads_reopen", {
        projectPath,
        id,
      });
      await fetchIssues();
    } catch (err) {
      set({ error: String(err), loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

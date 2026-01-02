import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBeadsStore } from "./beadsStore";
import { invoke } from "@tauri-apps/api/core";
import type { BeadsIssue, BeadsStats } from "@/types/beads";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

// Helper to reset store state while preserving methods
const resetStore = () => {
  const state = useBeadsStore.getState();
  const methods: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    const stateRecord = state as unknown as Record<string, unknown>;
    if (typeof stateRecord[key] === "function") {
      methods[key] = stateRecord[key];
    }
  }

  useBeadsStore.setState({
    issues: [],
    stats: null,
    loading: false,
    error: null,
    projectPath: null,
    ...methods,
  });
};

const mockIssue: BeadsIssue = {
  id: "test-1",
  title: "Test Issue",
  status: "open",
  priority: 2,
  issue_type: "task",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockStats: BeadsStats = {
  total: 10,
  open: 5,
  in_progress: 2,
  blocked: 1,
  closed: 2,
  ready: 3,
};

describe("beadsStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe("setProjectPath", () => {
    it("sets project path and resets state", () => {
      // First set some state
      useBeadsStore.setState({
        issues: [mockIssue],
        stats: mockStats,
        error: "some error",
      });

      useBeadsStore.getState().setProjectPath("/new/project");

      const state = useBeadsStore.getState();
      expect(state.projectPath).toBe("/new/project");
      expect(state.issues).toEqual([]);
      expect(state.stats).toBeNull();
      expect(state.error).toBeNull();
    });

    it("does not reset state if path is the same", () => {
      useBeadsStore.setState({
        projectPath: "/existing/project",
        issues: [mockIssue],
        stats: mockStats,
      });

      useBeadsStore.getState().setProjectPath("/existing/project");

      const state = useBeadsStore.getState();
      expect(state.issues).toHaveLength(1);
      expect(state.stats).not.toBeNull();
    });

    it("handles null path", () => {
      useBeadsStore.setState({
        projectPath: "/some/project",
        issues: [mockIssue],
      });

      useBeadsStore.getState().setProjectPath(null);

      const state = useBeadsStore.getState();
      expect(state.projectPath).toBeNull();
      expect(state.issues).toEqual([]);
    });
  });

  describe("fetchIssues", () => {
    it("fetches issues from backend", async () => {
      const issues: BeadsIssue[] = [mockIssue, { ...mockIssue, id: "test-2" }];
      mockInvoke.mockResolvedValueOnce(issues);

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().fetchIssues();

      expect(mockInvoke).toHaveBeenCalledWith("beads_list", {
        projectPath: "/test/project",
      });
      expect(useBeadsStore.getState().issues).toEqual(issues);
      expect(useBeadsStore.getState().loading).toBe(false);
    });

    it("sets loading state during fetch", async () => {
      let resolvePromise: (value: BeadsIssue[]) => void;
      const pendingPromise = new Promise<BeadsIssue[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(pendingPromise);

      useBeadsStore.getState().setProjectPath("/test/project");
      const fetchPromise = useBeadsStore.getState().fetchIssues();

      expect(useBeadsStore.getState().loading).toBe(true);

      resolvePromise!([]);
      await fetchPromise;

      expect(useBeadsStore.getState().loading).toBe(false);
    });

    it("handles fetch errors", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Failed to fetch"));

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().fetchIssues();

      expect(useBeadsStore.getState().error).toBe("Error: Failed to fetch");
      expect(useBeadsStore.getState().loading).toBe(false);
    });

    it("does nothing without project path", async () => {
      await useBeadsStore.getState().fetchIssues();

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("fetchStats", () => {
    it("fetches stats from backend", async () => {
      mockInvoke.mockResolvedValueOnce(mockStats);

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().fetchStats();

      expect(mockInvoke).toHaveBeenCalledWith("beads_stats", {
        projectPath: "/test/project",
      });
      expect(useBeadsStore.getState().stats).toEqual(mockStats);
    });

    it("logs error but does not set error state on failure", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockInvoke.mockRejectedValueOnce(new Error("Failed"));

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().fetchStats();

      expect(consoleSpy).toHaveBeenCalled();
      expect(useBeadsStore.getState().error).toBeNull();

      consoleSpy.mockRestore();
    });

    it("does nothing without project path", async () => {
      await useBeadsStore.getState().fetchStats();

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("createIssue", () => {
    it("creates issue and refetches list", async () => {
      mockInvoke.mockResolvedValueOnce("new-issue-id"); // create
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      const id = await useBeadsStore.getState().createIssue(
        "New Task",
        "task",
        2,
        "Description"
      );

      expect(id).toBe("new-issue-id");
      expect(mockInvoke).toHaveBeenCalledWith("beads_create", {
        projectPath: "/test/project",
        title: "New Task",
        issueType: "task",
        priority: 2,
        description: "Description",
      });
    });

    it("passes null for empty description", async () => {
      mockInvoke.mockResolvedValueOnce("id");
      mockInvoke.mockResolvedValueOnce([]);

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().createIssue("Task", "task", 2);

      expect(mockInvoke).toHaveBeenCalledWith("beads_create", {
        projectPath: "/test/project",
        title: "Task",
        issueType: "task",
        priority: 2,
        description: null,
      });
    });

    it("throws error without project path", async () => {
      await expect(
        useBeadsStore.getState().createIssue("Task", "task", 2)
      ).rejects.toThrow("No project path set");
    });

    it("handles create errors", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Create failed"));

      useBeadsStore.getState().setProjectPath("/test/project");

      await expect(
        useBeadsStore.getState().createIssue("Task", "task", 2)
      ).rejects.toThrow("Create failed");

      expect(useBeadsStore.getState().error).toBe("Error: Create failed");
    });
  });

  describe("updateIssue", () => {
    it("updates issue and refetches list", async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // update
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().updateIssue("test-1", {
        title: "Updated Title",
        status: "in_progress",
      });

      expect(mockInvoke).toHaveBeenCalledWith("beads_update", {
        projectPath: "/test/project",
        id: "test-1",
        updates: { title: "Updated Title", status: "in_progress" },
      });
    });

    it("handles phase updates separately", async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // update_phase
      mockInvoke.mockResolvedValueOnce(undefined); // update
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().updateIssue("test-1", {
        title: "Updated",
        phase: 2,
      });

      expect(mockInvoke).toHaveBeenCalledWith("beads_update_phase", {
        projectPath: "/test/project",
        id: "test-1",
        phase: 2,
      });
      expect(mockInvoke).toHaveBeenCalledWith("beads_update", {
        projectPath: "/test/project",
        id: "test-1",
        updates: { title: "Updated" },
      });
    });

    it("handles phase-only updates", async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // update_phase
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().updateIssue("test-1", { phase: 1 });

      expect(mockInvoke).toHaveBeenCalledWith("beads_update_phase", {
        projectPath: "/test/project",
        id: "test-1",
        phase: 1,
      });
      // Should not call beads_update since only phase was set
      expect(mockInvoke).not.toHaveBeenCalledWith(
        "beads_update",
        expect.anything()
      );
    });

    it("throws error without project path", async () => {
      await expect(
        useBeadsStore.getState().updateIssue("test-1", { title: "New" })
      ).rejects.toThrow("No project path set");
    });
  });

  describe("closeIssue", () => {
    it("closes issue with reason and refetches", async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // close
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().closeIssue("test-1", "Done");

      expect(mockInvoke).toHaveBeenCalledWith("beads_close", {
        projectPath: "/test/project",
        id: "test-1",
        reason: "Done",
      });
    });

    it("throws error without project path", async () => {
      await expect(
        useBeadsStore.getState().closeIssue("test-1", "Done")
      ).rejects.toThrow("No project path set");
    });

    it("handles close errors", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Close failed"));

      useBeadsStore.getState().setProjectPath("/test/project");

      await expect(
        useBeadsStore.getState().closeIssue("test-1", "Done")
      ).rejects.toThrow("Close failed");

      expect(useBeadsStore.getState().error).toBe("Error: Close failed");
    });
  });

  describe("reopenIssue", () => {
    it("reopens issue and refetches", async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // reopen
      mockInvoke.mockResolvedValueOnce([mockIssue]); // fetch

      useBeadsStore.getState().setProjectPath("/test/project");
      await useBeadsStore.getState().reopenIssue("test-1");

      expect(mockInvoke).toHaveBeenCalledWith("beads_reopen", {
        projectPath: "/test/project",
        id: "test-1",
      });
    });

    it("throws error without project path", async () => {
      await expect(
        useBeadsStore.getState().reopenIssue("test-1")
      ).rejects.toThrow("No project path set");
    });

    it("handles reopen errors", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Reopen failed"));

      useBeadsStore.getState().setProjectPath("/test/project");

      await expect(
        useBeadsStore.getState().reopenIssue("test-1")
      ).rejects.toThrow("Reopen failed");

      expect(useBeadsStore.getState().error).toBe("Error: Reopen failed");
    });
  });

  describe("clearError", () => {
    it("clears the error state", () => {
      useBeadsStore.setState({ error: "Some error" });

      useBeadsStore.getState().clearError();

      expect(useBeadsStore.getState().error).toBeNull();
    });
  });
});

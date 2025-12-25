import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { BeadsIssue } from "@/types/beads";
import type {
  AutoBuildState,
  AutoBuildStatus,
  AutoBuildPhase,
  AutoBuildLogEntry,
  AutoBuildSettings,
  AutoBuildResult,
  VerificationResult,
} from "@/types/autoBuild";

interface AutoBuildActions {
  // UI
  openPopup: () => void;
  closePopup: () => void;

  // Project
  setProjectPath: (path: string | null) => void;

  // Queue Management
  addToQueue: (issueId: string) => void;
  removeFromQueue: (issueId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Agent Control
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  skipCurrent: () => void;

  // Internal
  setStatus: (status: AutoBuildStatus) => void;
  setPhase: (phase: AutoBuildPhase) => void;
  setProgress: (progress: number) => void;
  addLog: (type: AutoBuildLogEntry["type"], message: string, issueId?: string) => void;
  clearLogs: () => void;
  cacheIssue: (issue: BeadsIssue) => void;
  getCachedIssue: (id: string) => BeadsIssue | undefined;

  // Settings
  updateSettings: (settings: Partial<AutoBuildSettings>) => void;

  // Session
  saveSession: () => Promise<void>;
  loadSession: () => Promise<boolean>;
  clearSession: () => Promise<void>;

  // Agent Loop
  runAgentLoop: () => Promise<void>;
  executeWork: (issueId: string) => Promise<AutoBuildResult>;
  runVerification: () => Promise<VerificationResult>;
  commitChanges: (issueId: string) => Promise<void>;
  closeIssue: (issueId: string, reason: string) => Promise<void>;
  markBlocked: (issueId: string) => Promise<void>;
}

const DEFAULT_SETTINGS_VALUE: AutoBuildSettings = {
  autoCommit: true,
  runLint: true,
  runTests: true,
  runBuild: true,
  maxRetries: 1,
  priorityThreshold: 4,
};

export const useAutoBuildStore = create<AutoBuildState & AutoBuildActions>((set, get) => ({
  // Initial State
  isPopupOpen: false,
  status: "idle",
  currentIssueId: null,
  currentPhase: null,
  queue: [],
  completed: [],
  retryCount: 0,
  progress: 0,
  logs: [],
  settings: DEFAULT_SETTINGS_VALUE,
  projectPath: null,
  issueCache: new Map(),

  // UI Actions
  openPopup: () => set({ isPopupOpen: true }),
  closePopup: () => set({ isPopupOpen: false }),

  // Project
  setProjectPath: (path) => set({ projectPath: path }),

  // Queue Management
  addToQueue: (issueId) => {
    const { queue } = get();
    if (!queue.includes(issueId)) {
      set({ queue: [...queue, issueId] });
    }
  },

  removeFromQueue: (issueId) => {
    const { queue } = get();
    set({ queue: queue.filter((id) => id !== issueId) });
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue } = get();
    const newQueue = [...queue];
    const [removed] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, removed);
    set({ queue: newQueue });
  },

  clearQueue: () => set({ queue: [] }),

  // Agent Control
  start: async () => {
    const { status, queue, runAgentLoop, addLog, saveSession } = get();
    if (status === "running") return;
    if (queue.length === 0) {
      addLog("warning", "No issues in queue");
      return;
    }

    set({ status: "running", retryCount: 0 });
    addLog("info", `Starting Auto Build with ${queue.length} issues`);
    await saveSession();
    await runAgentLoop();
  },

  pause: () => {
    const { status, addLog, saveSession } = get();
    if (status !== "running") return;

    set({ status: "paused" });
    addLog("info", "Paused Auto Build");
    saveSession();
  },

  resume: async () => {
    const { status, queue, runAgentLoop, addLog, saveSession } = get();
    if (status !== "paused") return;
    if (queue.length === 0) {
      addLog("warning", "No issues remaining in queue");
      set({ status: "idle" });
      return;
    }

    set({ status: "running", retryCount: 0 });
    addLog("info", "Resuming Auto Build");
    await saveSession();
    await runAgentLoop();
  },

  stop: () => {
    const { addLog, clearSession } = get();
    set({
      status: "idle",
      currentIssueId: null,
      currentPhase: null,
      progress: 0,
      retryCount: 0,
    });
    addLog("info", "Stopped Auto Build");
    clearSession();
  },

  skipCurrent: () => {
    const { currentIssueId, queue, addLog } = get();
    if (!currentIssueId) return;

    const newQueue = queue.filter((id) => id !== currentIssueId);
    set({
      queue: newQueue,
      currentIssueId: null,
      currentPhase: null,
      progress: 0,
      retryCount: 0,
    });
    addLog("warning", `Skipped issue ${currentIssueId}`, currentIssueId);
  },

  // Internal
  setStatus: (status) => set({ status }),
  setPhase: (phase) => set({ currentPhase: phase }),
  setProgress: (progress) => set({ progress }),

  addLog: (type, message, issueId) => {
    const { logs } = get();
    const entry: AutoBuildLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      issueId,
    };
    set({ logs: [...logs.slice(-99), entry] });
  },

  clearLogs: () => set({ logs: [] }),

  cacheIssue: (issue) => {
    const { issueCache } = get();
    const newCache = new Map(issueCache);
    newCache.set(issue.id, issue);
    set({ issueCache: newCache });
  },

  getCachedIssue: (id) => get().issueCache.get(id),

  // Settings
  updateSettings: (newSettings) => {
    const { settings } = get();
    set({ settings: { ...settings, ...newSettings } });
  },

  // Session Persistence
  saveSession: async () => {
    const { projectPath, status, queue, completed, currentIssueId, currentPhase, retryCount, settings } = get();
    if (!projectPath) return;

    try {
      await invoke("auto_build_save_session", {
        projectPath,
        session: {
          sessionId: `auto-build-${Date.now()}`,
          status,
          queue,
          completed,
          currentIssueId,
          currentPhase,
          retryCount,
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          settings,
        },
      });
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  },

  loadSession: async () => {
    const { projectPath, addLog } = get();
    if (!projectPath) return false;

    try {
      const session = await invoke<{
        sessionId: string;
        status: AutoBuildStatus;
        queue: string[];
        completed: string[];
        currentIssueId: string | null;
        currentPhase: AutoBuildPhase;
        retryCount: number;
        settings: AutoBuildSettings;
      } | null>("auto_build_load_session", { projectPath });

      if (session && (session.status === "running" || session.status === "paused")) {
        set({
          status: "paused",
          queue: session.queue,
          completed: session.completed,
          currentIssueId: session.currentIssueId,
          currentPhase: session.currentPhase,
          retryCount: session.retryCount,
          settings: session.settings,
        });
        addLog("info", "Recovered previous session");
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to load session:", err);
      return false;
    }
  },

  clearSession: async () => {
    const { projectPath } = get();
    if (!projectPath) return;

    try {
      await invoke("auto_build_clear_session", { projectPath });
    } catch (err) {
      console.error("Failed to clear session:", err);
    }
  },

  // Agent Loop
  runAgentLoop: async () => {
    const {
      settings,
      addLog,
      setPhase,
      setProgress,
      executeWork,
      runVerification,
      commitChanges,
      closeIssue,
      markBlocked,
      saveSession,
      getCachedIssue,
    } = get();

    while (get().status === "running" && get().queue.length > 0) {
      const currentQueue = get().queue;
      const issueId = currentQueue[0];

      set({ currentIssueId: issueId, retryCount: 0, progress: 0 });

      const issue = getCachedIssue(issueId);
      addLog("info", `Starting: ${issue?.title || issueId}`, issueId);

      // Phase 1: Working
      setPhase("working");
      setProgress(10);
      await saveSession();

      try {
        const result = await executeWork(issueId);

        if (!result.success) {
          const currentRetry = get().retryCount;
          if (currentRetry < settings.maxRetries) {
            set({ retryCount: currentRetry + 1 });
            addLog("warning", `Retrying (${currentRetry + 1}/${settings.maxRetries})`, issueId);
            continue;
          }
          addLog("error", `Failed after ${settings.maxRetries} retries: ${result.error}`, issueId);
          await markBlocked(issueId);
          set({
            queue: get().queue.filter((id) => id !== issueId),
            currentIssueId: null,
            currentPhase: null,
            retryCount: 0,
          });
          continue;
        }

        setProgress(50);

        // Phase 2: Testing
        setPhase("testing");
        addLog("info", "Running verification", issueId);

        const verification = await runVerification();

        if (!verification.success) {
          const currentRetry = get().retryCount;
          if (currentRetry < settings.maxRetries) {
            set({ retryCount: currentRetry + 1 });
            addLog("warning", `Verification failed, retrying (${currentRetry + 1}/${settings.maxRetries})`, issueId);
            continue;
          }
          addLog("error", "Verification failed after retries", issueId);
          await markBlocked(issueId);
          set({
            queue: get().queue.filter((id) => id !== issueId),
            currentIssueId: null,
            currentPhase: null,
            retryCount: 0,
          });
          continue;
        }

        setProgress(80);

        // Phase 3: Committing
        if (settings.autoCommit) {
          setPhase("committing");
          addLog("info", "Committing changes", issueId);
          await commitChanges(issueId);
        }

        setProgress(90);

        // Close issue
        await closeIssue(issueId, "Completed by Auto Build");
        addLog("success", `Completed: ${issue?.title || issueId}`, issueId);

        // Move to completed
        set({
          queue: get().queue.filter((id) => id !== issueId),
          completed: [...get().completed.slice(-9), issueId],
          currentIssueId: null,
          currentPhase: null,
          progress: 100,
          retryCount: 0,
        });

        await saveSession();
      } catch (err) {
        addLog("error", `Error: ${err}`, issueId);
        const currentRetry = get().retryCount;
        if (currentRetry < settings.maxRetries) {
          set({ retryCount: currentRetry + 1 });
          continue;
        }
        await markBlocked(issueId);
        set({
          queue: get().queue.filter((id) => id !== issueId),
          currentIssueId: null,
          currentPhase: null,
          retryCount: 0,
        });
      }

      // Check if paused
      if (get().status === "paused") {
        await saveSession();
        return;
      }
    }

    // Finished all issues
    if (get().status === "running") {
      set({ status: "idle", currentIssueId: null, currentPhase: null });
      addLog("success", "All issues completed");
      get().clearSession();
    }
  },

  executeWork: async (issueId) => {
    const { projectPath, getCachedIssue, addLog } = get();
    if (!projectPath) {
      return { success: false, output: "", error: "No project path" };
    }

    const issue = getCachedIssue(issueId);
    if (!issue) {
      return { success: false, output: "", error: "Issue not found in cache" };
    }

    try {
      addLog("claude", `Invoking Claude for: ${issue.title}`, issueId);

      const result = await invoke<AutoBuildResult>("auto_build_run_claude", {
        projectPath,
        issueId: issue.id,
        issueTitle: issue.title,
        issueDescription: issue.description || "",
        issueType: issue.issue_type,
      });

      if (result.success) {
        addLog("success", "Claude completed work", issueId);
      }

      return result;
    } catch (err) {
      return { success: false, output: "", error: String(err) };
    }
  },

  runVerification: async () => {
    const { projectPath, settings, addLog } = get();
    if (!projectPath) {
      return {
        success: false,
        lint: { success: false, output: "No project path" },
        tests: { success: false, output: "No project path" },
        build: { success: false, output: "No project path" },
      };
    }

    try {
      const result = await invoke<VerificationResult>("auto_build_run_verification", {
        projectPath,
        runLint: settings.runLint,
        runTests: settings.runTests,
        runBuild: settings.runBuild,
      });

      if (settings.runLint) {
        addLog(result.lint.success ? "success" : "error", `Lint: ${result.lint.success ? "passed" : "failed"}`);
      }
      if (settings.runTests) {
        addLog(result.tests.success ? "success" : "error", `Tests: ${result.tests.success ? "passed" : "failed"}`);
      }
      if (settings.runBuild) {
        addLog(result.build.success ? "success" : "error", `Build: ${result.build.success ? "passed" : "failed"}`);
      }

      return result;
    } catch (err) {
      return {
        success: false,
        lint: { success: false, output: String(err) },
        tests: { success: false, output: String(err) },
        build: { success: false, output: String(err) },
      };
    }
  },

  commitChanges: async (issueId) => {
    const { projectPath, getCachedIssue } = get();
    if (!projectPath) return;

    const issue = getCachedIssue(issueId);
    const message = issue ? `${issue.issue_type}: ${issue.title}` : `Completed ${issueId}`;

    try {
      await invoke("auto_build_commit", {
        projectPath,
        message,
        issueId,
      });
    } catch (err) {
      console.error("Failed to commit:", err);
      throw err;
    }
  },

  closeIssue: async (issueId, reason) => {
    const { projectPath } = get();
    if (!projectPath) return;

    try {
      await invoke("beads_close", {
        projectPath,
        id: issueId,
        reason,
      });
    } catch (err) {
      console.error("Failed to close issue:", err);
    }
  },

  markBlocked: async (issueId) => {
    const { projectPath, addLog } = get();
    if (!projectPath) return;

    try {
      await invoke("beads_update", {
        projectPath,
        id: issueId,
        updates: { status: "blocked" },
      });
      addLog("warning", `Marked as blocked: ${issueId}`, issueId);
    } catch (err) {
      console.error("Failed to mark blocked:", err);
    }
  },
}));

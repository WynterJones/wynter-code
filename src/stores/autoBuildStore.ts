import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { BeadsIssue } from "@/types/beads";
import type {
  AutoBuildState,
  AutoBuildStatus,
  AutoBuildPhase,
  AutoBuildLogEntry,
  AutoBuildSettings,
  AutoBuildResult,
  VerificationResult,
  AutoBuildStreamingState,
  SiloProgress,
} from "@/types/autoBuild";
import type { StreamChunk } from "@/types";

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

  // Human Review
  moveToReview: (issueId: string) => void;
  completeReview: (issueId: string) => Promise<void>;
  requestRefactor: (issueId: string, reason: string) => Promise<void>;

  // Streaming
  setStreamingState: (state: AutoBuildStreamingState | null) => void;
  updateStreamingAction: (action: string, toolName?: string) => void;

  // SILO Progress
  loadSiloContext: (issueId: string) => Promise<string | null>;
  updateSiloProgress: (issueId: string, progress: SiloProgress) => Promise<void>;

  // Agent Loop
  runAgentLoop: () => Promise<void>;
  executeWork: (issueId: string) => Promise<AutoBuildResult>;
  executeStreamingWork: (issueId: string, fixMode?: boolean, errors?: string) => Promise<boolean>;
  runVerification: () => Promise<VerificationResult>;
  runFixLoop: (issueId: string, errors: string) => Promise<boolean>;
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
  requireHumanReview: true,
};

export const useAutoBuildStore = create<AutoBuildState & AutoBuildActions>((set, get) => ({
  // Initial State
  isPopupOpen: false,
  status: "idle",
  currentIssueId: null,
  currentPhase: null,
  queue: [],
  completed: [],
  humanReview: [],
  retryCount: 0,
  progress: 0,
  streamingState: null,
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
    const { queue, saveSession } = get();
    if (!queue.includes(issueId)) {
      set({ queue: [...queue, issueId] });
      // Persist immediately
      saveSession();
    }
  },

  removeFromQueue: (issueId) => {
    const { queue, saveSession } = get();
    set({ queue: queue.filter((id) => id !== issueId) });
    // Persist immediately
    saveSession();
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

  // Human Review Actions
  moveToReview: (issueId) => {
    const { queue, humanReview, addLog, getCachedIssue } = get();
    const issue = getCachedIssue(issueId);
    set({
      queue: queue.filter((id) => id !== issueId),
      humanReview: [...humanReview, issueId],
      currentIssueId: null,
      currentPhase: "reviewing",
    });
    addLog("info", `Moved to Human Review: ${issue?.title || issueId}`, issueId);
  },

  completeReview: async (issueId) => {
    const { humanReview, completed, projectPath, addLog, getCachedIssue, closeIssue, commitChanges, settings } = get();
    const issue = getCachedIssue(issueId);

    // Commit if auto-commit is enabled
    if (settings.autoCommit && projectPath) {
      try {
        await commitChanges(issueId);
      } catch {
        // Continue even if commit fails
      }
    }

    // Close the issue
    await closeIssue(issueId, "Completed by Auto Build (reviewed)");

    set({
      humanReview: humanReview.filter((id) => id !== issueId),
      completed: [...completed.slice(-9), issueId],
    });
    addLog("success", `Review approved: ${issue?.title || issueId}`, issueId);
  },

  requestRefactor: async (issueId, reason) => {
    const { humanReview, queue, projectPath, addLog, getCachedIssue } = get();
    const issue = getCachedIssue(issueId);

    if (!projectPath) return;

    // Create a new refactor issue
    const refactorTitle = `Refactor: ${issue?.title || issueId}`;
    const refactorDescription = `Review requested refactoring for ${issueId}.\n\nReason: ${reason}\n\nOriginal issue: ${issue?.title}\n${issue?.description || ""}`;

    try {
      // Create new issue via beads
      await invoke("beads_create", {
        projectPath,
        title: refactorTitle,
        issueType: "task",
        priority: issue?.priority || 2,
        description: refactorDescription,
      });

      // Move original issue from review back to queue for refactoring
      set({
        humanReview: humanReview.filter((id) => id !== issueId),
        queue: [issueId, ...queue], // Add to front of queue
      });
      addLog("info", `Refactor requested: ${issue?.title || issueId}`, issueId);
    } catch (err) {
      addLog("error", `Failed to create refactor issue: ${err}`, issueId);
    }
  },

  // Streaming Actions
  setStreamingState: (state) => set({ streamingState: state }),

  updateStreamingAction: (action, toolName) => {
    const { streamingState } = get();
    if (!streamingState) return;
    set({
      streamingState: {
        ...streamingState,
        currentAction: action,
        currentTool: toolName,
      },
    });
  },

  // SILO Progress Actions
  loadSiloContext: async (issueId) => {
    const { projectPath } = get();
    if (!projectPath) return null;

    try {
      const content = await invoke<string | null>("auto_build_read_silo", {
        projectPath,
        issueId,
      });
      return content;
    } catch {
      return null;
    }
  },

  updateSiloProgress: async (issueId, progress) => {
    const { projectPath } = get();
    if (!projectPath) return;

    const content = `# Issue: ${progress.issueId}

## Task
${progress.issueTitle}

${progress.issueDescription || ""}

## Progress

### What Was Done
${progress.whatWasDone.map((item) => `- ${item}`).join("\n")}

### What's Next
${progress.whatsNext.map((item) => `- ${item}`).join("\n")}

### Current Step
${progress.currentStep}

---
Last Updated: ${progress.lastUpdated}
`;

    try {
      await invoke("auto_build_write_silo", {
        projectPath,
        issueId,
        content,
      });
    } catch (err) {
      console.error("Failed to write SILO file:", err);
    }
  },

  // Settings
  updateSettings: (newSettings) => {
    const { settings, saveSession } = get();
    set({ settings: { ...settings, ...newSettings } });
    // Persist immediately
    saveSession();
  },

  // Session Persistence
  saveSession: async () => {
    const { projectPath, status, queue, completed, humanReview, currentIssueId, currentPhase, retryCount, settings } = get();
    if (!projectPath) return;

    try {
      await invoke("auto_build_save_session", {
        projectPath,
        session: {
          sessionId: `auto-build-${Date.now()}`,
          status,
          queue,
          completed,
          humanReview,
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
        humanReview: string[];
        currentIssueId: string | null;
        currentPhase: AutoBuildPhase;
        retryCount: number;
        settings: AutoBuildSettings;
      } | null>("auto_build_load_session", { projectPath });

      if (session) {
        // Always restore queue, completed, humanReview and settings
        // For active sessions (running/paused), also restore state
        const wasActive = session.status === "running" || session.status === "paused";

        set({
          status: wasActive ? "paused" : "idle",
          queue: session.queue || [],
          completed: session.completed || [],
          humanReview: session.humanReview || [],
          currentIssueId: wasActive ? session.currentIssueId : null,
          currentPhase: wasActive ? session.currentPhase : null,
          retryCount: wasActive ? session.retryCount : 0,
          settings: session.settings || get().settings,
        });

        if (wasActive) {
          addLog("info", "Recovered previous session");
        } else if (session.queue?.length > 0) {
          addLog("info", `Restored ${session.queue.length} queued issue(s)`);
        }
        return wasActive;
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

  // Agent Loop (with streaming and Human Review support)
  runAgentLoop: async () => {
    const {
      settings,
      addLog,
      setPhase,
      setProgress,
      executeStreamingWork,
      runVerification,
      runFixLoop,
      commitChanges,
      markBlocked,
      moveToReview,
      closeIssue,
      saveSession,
      getCachedIssue,
    } = get();

    while (get().status === "running" && get().queue.length > 0) {
      const currentQueue = get().queue;
      const issueId = currentQueue[0];

      set({ currentIssueId: issueId, retryCount: 0, progress: 0 });

      const issue = getCachedIssue(issueId);
      addLog("info", `Starting: ${issue?.title || issueId}`, issueId);

      // Phase 1: Working (with streaming)
      setPhase("working");
      setProgress(10);
      await saveSession();

      try {
        const workSuccess = await executeStreamingWork(issueId);

        if (!workSuccess) {
          addLog("error", "Work phase failed", issueId);
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

        // Phase 2: Testing with fix loop
        setPhase("testing");
        addLog("info", "Running verification", issueId);

        let testsPass = false;
        let fixAttempts = 0;

        while (!testsPass && fixAttempts <= settings.maxRetries) {
          const verification = await runVerification();

          if (verification.success) {
            testsPass = true;
            addLog("success", "All verification passed", issueId);
          } else {
            // Build error string for fix attempt
            const errors: string[] = [];
            if (!verification.lint.success) errors.push(`Lint errors:\n${verification.lint.output}`);
            if (!verification.tests.success) errors.push(`Test failures:\n${verification.tests.output}`);
            if (!verification.build.success) errors.push(`Build errors:\n${verification.build.output}`);
            const errorString = errors.join("\n\n");

            if (fixAttempts < settings.maxRetries) {
              fixAttempts++;
              addLog("warning", `Verification failed, attempting fix (${fixAttempts}/${settings.maxRetries})`, issueId);

              // Phase: Fixing
              setPhase("fixing");
              const fixed = await runFixLoop(issueId, errorString);

              if (!fixed) {
                addLog("error", "Fix attempt failed", issueId);
                break;
              }

              setPhase("testing");
            } else {
              addLog("error", "Verification failed after max fix attempts", issueId);
              break;
            }
          }
        }

        if (!testsPass) {
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

        // Phase 3: Commit (if not requiring human review)
        if (!settings.requireHumanReview && settings.autoCommit) {
          setPhase("committing");
          addLog("info", "Committing changes", issueId);
          await commitChanges(issueId);
        }

        setProgress(90);

        // Phase 4: Human Review or Complete
        if (settings.requireHumanReview) {
          moveToReview(issueId);
          addLog("info", `Awaiting human review: ${issue?.title || issueId}`, issueId);
        } else {
          // Auto-complete
          await closeIssue(issueId, "Completed by Auto Build");
          addLog("success", `Completed: ${issue?.title || issueId}`, issueId);

          set({
            queue: get().queue.filter((id) => id !== issueId),
            completed: [...get().completed.slice(-9), issueId],
            currentIssueId: null,
            currentPhase: null,
            progress: 100,
            retryCount: 0,
          });
        }

        await saveSession();
      } catch (err) {
        addLog("error", `Error: ${err}`, issueId);
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

    // Finished all issues in queue (some may be in human review)
    if (get().status === "running") {
      const { humanReview } = get();
      if (humanReview.length > 0) {
        set({ status: "paused", currentIssueId: null, currentPhase: null });
        addLog("info", `Queue complete. ${humanReview.length} issue(s) awaiting review`);
      } else {
        set({ status: "idle", currentIssueId: null, currentPhase: null });
        addLog("success", "All issues completed");
        get().clearSession();
      }
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

  // Streaming work execution using Claude CLI stream-json mode
  executeStreamingWork: async (issueId, fixMode = false, errors) => {
    const { projectPath, getCachedIssue, addLog, setStreamingState, updateStreamingAction, loadSiloContext } = get();

    if (!projectPath) {
      addLog("error", "No project path", issueId);
      return false;
    }

    const issue = getCachedIssue(issueId);
    if (!issue) {
      addLog("error", "Issue not found in cache", issueId);
      return false;
    }

    const sessionId = `autobuild-${issueId}-${Date.now()}`;

    // Load existing SILO context
    const siloContext = await loadSiloContext(issueId);

    // Build prompt based on mode
    let prompt: string;
    if (fixMode && errors) {
      prompt = `You are fixing test/lint/build failures for issue ${issue.id}.

Issue: ${issue.title}
Type: ${issue.issue_type}

${siloContext ? `Previous context from _SILO file:\n${siloContext}\n` : ""}

Verification failed with:
${errors}

Please fix the issues and ensure lint/tests/build pass. Do NOT commit - I will handle that.`;
    } else {
      prompt = `You are implementing issue ${issue.id}.
Type: ${issue.issue_type}
Title: ${issue.title}
Description: ${issue.description || "No description provided"}

${siloContext ? `Previous context:\n${siloContext}` : "No previous context."}

Please:
1. Understand what needs to be done
2. Implement the changes
3. Keep code mergeable at all times
4. Do NOT commit - I will handle that

When done, your last message should confirm what was completed.`;
    }

    // Set up streaming state
    setStreamingState({
      isStreaming: true,
      startTime: Date.now(),
      currentAction: fixMode ? "Fixing issues" : "Implementing",
    });

    addLog("claude", fixMode ? "Invoking Claude to fix issues" : `Invoking Claude for: ${issue.title}`, issueId);

    return new Promise<boolean>((resolve) => {
      let unlisten: UnlistenFn | null = null;
      let resolved = false;

      const cleanup = () => {
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
        setStreamingState(null);
      };

      // Set up event listener for claude-stream
      listen<StreamChunk>("claude-stream", (event) => {
        const chunk = event.payload;
        if (chunk.session_id !== sessionId) return;

        switch (chunk.chunk_type) {
          case "tool_use":
          case "tool_start": {
            const toolName = chunk.tool_name || "Working";
            // Extract brief action from tool input if available
            let action = toolName;
            if (chunk.tool_input) {
              try {
                const input = JSON.parse(chunk.tool_input) as Record<string, unknown>;
                if (input.file_path) {
                  const path = String(input.file_path);
                  const filename = path.split("/").pop() || path;
                  action = `${toolName}: ${filename}`;
                } else if (input.command) {
                  const cmd = String(input.command).slice(0, 30);
                  action = `${toolName}: ${cmd}...`;
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
            updateStreamingAction(action, toolName);
            break;
          }
          case "tool_result":
            updateStreamingAction("Processing", undefined);
            break;
          case "result":
            // Session complete - check for error
            if (!resolved) {
              resolved = true;
              cleanup();
              if (chunk.is_error) {
                addLog("error", `Claude error: ${chunk.content || "Unknown error"}`, issueId);
                resolve(false);
              } else {
                addLog("success", fixMode ? "Claude fixed issues" : "Claude completed work", issueId);
                resolve(true);
              }
            }
            break;
        }
      }).then((fn) => {
        unlisten = fn;
      });

      // Start the Claude session
      invoke("start_claude_session", {
        cwd: projectPath,
        sessionId,
        permissionMode: "acceptEdits",
        safeMode: true,
      }).then(() => {
        // Send the prompt
        return invoke("send_claude_input", {
          sessionId,
          input: prompt,
        });
      }).catch((err) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          addLog("error", `Failed to start Claude: ${err}`, issueId);
          resolve(false);
        }
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          addLog("error", "Claude session timed out", issueId);
          invoke("terminate_claude_session", { sessionId }).catch(() => {});
          resolve(false);
        }
      }, 10 * 60 * 1000);
    });
  },

  // Run fix loop - invoke Claude to fix test/lint/build failures
  runFixLoop: async (issueId, errors) => {
    const { executeStreamingWork } = get();
    return executeStreamingWork(issueId, true, errors);
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

import type { BeadsIssue } from "./beads";

export type AutoBuildStatus = "idle" | "running" | "paused" | "error";
export type AutoBuildPhase =
  | "selecting"
  | "working"
  | "selfReviewing"      // Claude reviews its own code
  | "auditing"           // Orchestrator running parallel subagent audits
  | "testing"
  | "fixing"             // Claude is fixing test/lint/build/audit failures
  | "reviewing"          // Awaiting human review
  | "committing"
  | null;

export interface AutoBuildLogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error" | "warning" | "claude";
  message: string;
  issueId?: string;
}

export interface AutoBuildSettings {
  autoCommit: boolean;
  runLint: boolean;
  runTests: boolean;
  runBuild: boolean;
  maxRetries: number;
  priorityThreshold: number;
  requireHumanReview: boolean;  // default: true
  maxConcurrentIssues: number;  // default: 3
  ignoreUnrelatedFailures: boolean;  // default: true
  // AI Audits (subagent-based quality gates)
  runSecurityAudit: boolean;      // default: false
  runPerformanceAudit: boolean;   // default: false
  runCodeQualityAudit: boolean;   // default: false
  runAccessibilityAudit: boolean; // default: false (only runs if UI files changed)
  // Branch Management
  useFeatureBranches: boolean;    // default: false - create per-epic/issue branches
  autoCreatePR: boolean;          // default: false - create PR on epic/issue completion
  // Worktree Mode (overrides useFeatureBranches when enabled)
  useWorktrees: boolean;          // default: false - use per-issue git worktrees for isolation
}

// Worker state for concurrent issue processing
export interface AutoBuildWorker {
  id: number;
  issueId: string | null;
  phase: AutoBuildPhase;
  streamingState: AutoBuildStreamingState | null;
  retryCount: number;
  filesModified: string[];  // For test attribution
  startTime: number | null;
  worktreePath: string | null;  // Worktree path when using worktree mode
}

// Active worktree tracking for per-issue worktree mode
export interface ActiveWorktree {
  issueId: string;         // Issue being processed
  path: string;            // Worktree directory path
  branch: string;          // Branch name (autobuild/{issueId})
  workerId: number;        // Worker processing this issue
  createdAt: number;       // Timestamp for cleanup tracking
}

// Streaming state for real-time status display
export interface AutoBuildStreamingState {
  isStreaming: boolean;
  currentTool?: string;
  currentAction?: string;  // e.g., "Editing Button.tsx"
  startTime: number;
}

// Progress tracking for _SILO files (context for subsequent phases)
export interface SiloProgress {
  issueId: string;
  issueTitle: string;
  issueType: string;
  filesModified: string[];
  summary: string;           // Brief description of what was done
  notes?: string;            // Implementation details, approach taken
  lastUpdated: string;
}

export interface AutoBuildResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  lint: { success: boolean; output: string };
  tests: { success: boolean; output: string };
  build: { success: boolean; output: string };
}

// File-based audit results from _AUDIT/*.md files
export interface AuditFileResults {
  success: boolean;
  security?: string;
  performance?: string;
  codeQuality?: string;
  accessibility?: string;
  hasIssues: boolean;
}

export interface AutoBuildState {
  // UI State
  isPopupOpen: boolean;

  // Agent State
  status: AutoBuildStatus;
  currentIssueId: string | null;  // Legacy: for single worker mode
  currentPhase: AutoBuildPhase;   // Legacy: for single worker mode

  // Concurrent Workers
  workers: AutoBuildWorker[];

  // Queue Management
  queue: string[];
  completed: string[];
  humanReview: string[];  // IDs awaiting human review
  retryCount: number;

  // Progress
  progress: number;

  // Streaming
  streamingState: AutoBuildStreamingState | null;  // Legacy: for single worker mode

  // Logs
  logs: AutoBuildLogEntry[];

  // Settings
  settings: AutoBuildSettings;

  // Project
  projectPath: string | null;

  // Cached issue data
  issueCache: Map<string, BeadsIssue>;

  // File Coordinator
  fileCoordinatorPort: number | null;

  // Branch Management
  currentBranch: string | null;     // The autobuild branch we're working on
  originalBranch: string | null;    // Branch we started from (to return to)
  epicBranches: Map<string, string>; // epicId → branch name

  // Worktree Mode
  activeWorktrees: ActiveWorktree[]; // Active worktrees for per-issue mode
}


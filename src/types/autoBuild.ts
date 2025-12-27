import type { BeadsIssue } from "./beads";

export type AutoBuildStatus = "idle" | "running" | "paused" | "error";
export type AutoBuildPhase =
  | "selecting"
  | "working"
  | "testing"
  | "fixing"     // Claude is fixing test/lint/build failures
  | "reviewing"  // Awaiting human review
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
}

// Streaming state for real-time status display
export interface AutoBuildStreamingState {
  isStreaming: boolean;
  currentTool?: string;
  currentAction?: string;  // e.g., "Editing Button.tsx"
  startTime: number;
}

// Progress tracking for _SILO files
export interface SiloProgress {
  issueId: string;
  issueTitle: string;
  issueDescription?: string;
  currentStep: string;
  whatWasDone: string[];
  whatsNext: string[];
  lastUpdated: string;
}

export interface AutoBuildSession {
  sessionId: string;
  status: AutoBuildStatus;
  queue: string[];
  completed: string[];
  humanReview: string[];  // IDs awaiting human review
  currentIssueId: string | null;
  currentPhase: AutoBuildPhase;
  retryCount: number;
  startedAt: string;
  lastActivityAt: string;
  settings: AutoBuildSettings;
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

export interface AutoBuildState {
  // UI State
  isPopupOpen: boolean;

  // Agent State
  status: AutoBuildStatus;
  currentIssueId: string | null;
  currentPhase: AutoBuildPhase;

  // Queue Management
  queue: string[];
  completed: string[];
  humanReview: string[];  // IDs awaiting human review
  retryCount: number;

  // Progress
  progress: number;

  // Streaming
  streamingState: AutoBuildStreamingState | null;

  // Logs
  logs: AutoBuildLogEntry[];

  // Settings
  settings: AutoBuildSettings;

  // Project
  projectPath: string | null;

  // Cached issue data
  issueCache: Map<string, BeadsIssue>;
}

export const DEFAULT_SETTINGS: AutoBuildSettings = {
  autoCommit: true,
  runLint: true,
  runTests: true,
  runBuild: true,
  maxRetries: 1,
  priorityThreshold: 4,
  requireHumanReview: true,
};

export const PHASE_LABELS: Record<NonNullable<AutoBuildPhase>, string> = {
  selecting: "Selecting next issue",
  working: "Working on code",
  testing: "Running verification",
  fixing: "Fixing issues",
  reviewing: "Awaiting review",
  committing: "Committing changes",
};

export const STATUS_LABELS: Record<AutoBuildStatus, string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  error: "Error",
};

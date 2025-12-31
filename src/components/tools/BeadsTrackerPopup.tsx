import { useState, useEffect, useCallback, useRef } from "react";
import {
  CircleDot,
  ListTodo,
  Layers,
  LayoutGrid,
  HelpCircle,
  X,
  ChevronDown,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { IconButton, Tooltip } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { IssuesTab, EpicsTab, BoardTab, HelpTab } from "./beads";
import type { BeadsIssueType } from "@/types/beads";

type TabId = "issues" | "epics" | "board" | "help";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof ListTodo;
}

const TABS: Tab[] = [
  { id: "issues", label: "Issues", icon: ListTodo },
  { id: "epics", label: "Epics", icon: Layers },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "help", label: "Help", icon: HelpCircle },
];

interface BeadsTrackerPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type BeadsStatus = "checking" | "installed" | "not_installed_globally" | "not_initialized_in_project";

export function BeadsTrackerPopup({
  isOpen,
  onClose,
}: BeadsTrackerPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>("issues");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [beadsStatus, setBeadsStatus] = useState<BeadsStatus>("checking");
  const [copied, setCopied] = useState(false);

  const { setProjectPath, fetchIssues, fetchStats, stats, loading, projectPath: storeProjectPath, issues } = useBeadsStore();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const activeProject = activeProjectId ? getProject(activeProjectId) : undefined;
  const projectPath = activeProject?.path;

  const { createSession } = useSessionStore();
  const { queueCommand } = useTerminalStore();
  const hasFetchedRef = useRef(false);
  const hasRetriedRef = useRef(false);

  // Get the appropriate command based on current status
  const getCommand = useCallback(() => {
    return beadsStatus === "not_installed_globally"
      ? "npm install -g beads-cli"
      : "bd init";
  }, [beadsStatus]);

  const handleCopyCommand = async () => {
    await navigator.clipboard.writeText(getCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCommand = () => {
    if (!activeProjectId) return;
    const sessionId = createSession(activeProjectId, "terminal");
    queueCommand(sessionId, getCommand());
    onClose();
  };

  const handleOpenBeadsSite = async () => {
    await open("https://github.com/anthropics/beads-cli");
  };

  // Check if beads CLI is installed globally and if project is initialized
  const checkBeadsStatus = useCallback(async (path: string) => {
    try {
      // First check if beads CLI is installed globally
      const isGloballyInstalled = await invoke<boolean>("validate_mcp_command", { command: "bd" });

      if (!isGloballyInstalled) {
        setBeadsStatus("not_installed_globally");
        return false;
      }

      // CLI is installed, now check if project has .beads directory
      const hasInit = await invoke<boolean>("beads_has_init", { projectPath: path });

      if (!hasInit) {
        setBeadsStatus("not_initialized_in_project");
        return false;
      }

      setBeadsStatus("installed");
      return true;
    } catch {
      setBeadsStatus("not_installed_globally");
      return false;
    }
  }, []);

  useEffect(() => {
    if (isOpen && projectPath) {
      setBeadsStatus("checking");
      checkBeadsStatus(projectPath).then((isReady) => {
        if (isReady) {
          // Only fetch if we haven't already or if the project path changed
          const pathChanged = storeProjectPath !== projectPath;
          if (!hasFetchedRef.current || pathChanged) {
            setProjectPath(projectPath);
            fetchIssues();
            fetchStats();
            hasFetchedRef.current = true;
          }
        }
      });
    } else if (isOpen && !projectPath) {
      setBeadsStatus("not_installed_globally");
    }
    // Reset the refs when popup closes
    if (!isOpen) {
      hasFetchedRef.current = false;
      hasRetriedRef.current = false;
    }
  }, [isOpen, projectPath, storeProjectPath, setProjectPath, fetchIssues, fetchStats, checkBeadsStatus]);

  // Retry logic: if we fetched but got no issues, retry once after a short delay
  useEffect(() => {
    if (
      isOpen &&
      beadsStatus === "installed" &&
      !loading &&
      hasFetchedRef.current &&
      !hasRetriedRef.current &&
      issues.length === 0
    ) {
      hasRetriedRef.current = true;
      const retryTimer = setTimeout(() => {
        fetchIssues();
        fetchStats();
      }, 500);
      return () => clearTimeout(retryTimer);
    }
  }, [isOpen, beadsStatus, loading, issues.length, fetchIssues, fetchStats]);

  const handleCreateIssue = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchIssues();
    fetchStats();
  }, [fetchIssues, fetchStats]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateModal) {
          setShowCreateModal(false);
        } else {
          onClose();
        }
      }
    },
    [onClose, showCreateModal]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  // Show setup screen if beads is not installed globally or not initialized in project
  if (beadsStatus === "not_installed_globally" || beadsStatus === "not_initialized_in_project") {
    const isGlobalInstall = beadsStatus === "not_installed_globally";
    const command = getCommand();

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Beads Tracker"
        size="md"
      >
        <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center mb-6">
            <CircleDot className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-3">
            {isGlobalInstall ? "Set Up Beads" : "Initialize Beads"}
          </h2>
          {isGlobalInstall ? (
            <>
              <p className="text-sm text-text-secondary max-w-md mb-2">
                Beads is a lightweight issue tracker that lives in your project directory.
              </p>
              <p className="text-sm text-text-secondary max-w-md mb-6">
                Install globally via npm, then run <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">bd init</code> in your project to get started.
              </p>
            </>
          ) : (
            <p className="text-sm text-text-secondary max-w-md mb-6">
              Beads CLI is installed! Initialize it in this project to start tracking issues and tasks locally.
            </p>
          )}

          {/* Terminal-style code block */}
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg border border-neutral-700 px-4 py-3">
              <code className="text-sm font-mono text-neutral-100">
                <span className="text-neutral-500">$ </span>
                {command}
              </code>
              <button
                onClick={handleCopyCommand}
                className="ml-3 p-1.5 rounded hover:bg-neutral-700 transition-colors"
                title="Copy command"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-neutral-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeProjectId && (
              <button
                onClick={handleRunCommand}
                className="btn-primary flex items-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                <span>{isGlobalInstall ? "Install in Terminal" : "Initialize in Terminal"}</span>
              </button>
            )}
            <button
              onClick={handleOpenBeadsSite}
              className="btn-secondary flex items-center gap-2"
            >
              <span>Learn More</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show loading state while checking
  if (beadsStatus === "checking") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Beads Tracker"
        size="md"
      >
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary mt-4">Checking project configuration...</p>
        </div>
      </Modal>
    );
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Popup Container */}
        <div
          className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-150"
          style={{
            width: "calc(100vw - 60px)",
            height: "calc(100vh - 60px)",
            maxWidth: "1600px",
            maxHeight: "900px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-14 shrink-0 px-4 border-b border-border bg-bg-secondary">
            <div className="flex items-center gap-3">
              <CircleDot className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-text-primary">Beads</h2>
              {stats && (
                <div className="flex items-center gap-2 ml-4 text-xs text-text-secondary">
                  <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                    {stats.open} open
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    {stats.in_progress} in progress
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-500/20 text-neutral-400">
                    {stats.closed} closed
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="Refresh">
                <IconButton size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </IconButton>
              </Tooltip>
              <Tooltip content="Close">
                <IconButton size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </IconButton>
              </Tooltip>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-border">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "text-text-primary border-accent"
                      : "text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-tertiary/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0">
            {activeTab === "issues" && (
              <IssuesTab onCreateIssue={handleCreateIssue} />
            )}
            {activeTab === "epics" && <EpicsTab />}
            {activeTab === "board" && <BoardTab />}
            {activeTab === "help" && <HelpTab />}
          </div>
        </div>
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>,
    document.body
  );
}

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateIssueModal({ isOpen, onClose }: CreateIssueModalProps) {
  const { createIssue, loading } = useBeadsStore();
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState<BeadsIssueType>("task");
  const [priority, setPriority] = useState(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await createIssue(title, issueType, priority);
      onClose();
      setTitle("");
      setIssueType("task");
      setPriority(2);
    } catch (err) {
      console.error("Failed to create issue:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border rounded-lg p-4 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-text-primary">
            Create Issue
          </h3>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="beads-issue-title" className="block text-xs text-text-secondary mb-1">
              Title
            </label>
            <input
              id="beads-issue-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title..."
              className="w-full bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="beads-issue-type" className="block text-xs text-text-secondary mb-1">Type</label>
            <div className="relative">
              <select
                id="beads-issue-type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as BeadsIssueType)}
                className="w-full appearance-none bg-bg-tertiary border border-border rounded-md px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="task">Task</option>
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="epic">Epic</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="beads-issue-priority" className="block text-xs text-text-secondary mb-1">
              Priority
            </label>
            <div className="relative">
              <select
                id="beads-issue-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full appearance-none bg-bg-tertiary border border-border rounded-md px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value={0}>0 - Critical</option>
                <option value={1}>1 - High</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - Low</option>
                <option value={4}>4 - Trivial</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="px-3 py-1.5 text-sm bg-accent text-primary-950 rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

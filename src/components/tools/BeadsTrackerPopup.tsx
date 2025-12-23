import { useState, useEffect, useCallback } from "react";
import {
  CircleDot,
  ListTodo,
  Layers,
  LayoutGrid,
  HelpCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { Modal, IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
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
  projectPath: string;
}

export function BeadsTrackerPopup({
  isOpen,
  onClose,
  projectPath,
}: BeadsTrackerPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>("issues");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { setProjectPath, fetchIssues, fetchStats, stats } = useBeadsStore();

  useEffect(() => {
    if (isOpen && projectPath) {
      setProjectPath(projectPath);
      fetchIssues();
      fetchStats();
    }
  }, [isOpen, projectPath, setProjectPath, fetchIssues, fetchStats]);

  const handleCreateIssue = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="full" showCloseButton={false}>
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
      </Modal>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
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
            <label className="block text-xs text-text-secondary mb-1">
              Title
            </label>
            <input
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
            <label className="block text-xs text-text-secondary mb-1">Type</label>
            <div className="relative">
              <select
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
            <label className="block text-xs text-text-secondary mb-1">
              Priority
            </label>
            <div className="relative">
              <select
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
              className="px-3 py-1.5 text-sm bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

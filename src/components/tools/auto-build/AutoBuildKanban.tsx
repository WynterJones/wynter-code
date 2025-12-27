import { useMemo, useState } from "react";
import { Plus, Inbox, Loader2, FlaskConical, Eye, Check, CheckCircle2, Settings, Layers, ChevronRight } from "lucide-react";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { AutoBuildIssueCard } from "./AutoBuildIssueCard";
import { AutoBuildNewIssuePopup } from "./AutoBuildNewIssuePopup";
import { cn } from "@/lib/utils";
import type { BeadsIssue, BeadsIssueType } from "@/types/beads";
import type { AutoBuildSettings } from "@/types/autoBuild";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { Tooltip } from "@/components/ui";
import { invoke } from "@tauri-apps/api/core";

interface AutoBuildKanbanProps {
  issues: BeadsIssue[];
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: BeadsIssue[];
  emptyMessage: string;
}

const TYPE_COLORS: Record<BeadsIssueType, string> = {
  task: "bg-blue-500/20 text-blue-400",
  feature: "bg-green-500/20 text-green-400",
  bug: "bg-red-500/20 text-red-400",
  epic: "bg-purple-500/20 text-purple-400",
};

export function AutoBuildKanban({ issues }: AutoBuildKanbanProps) {
  const { queue, completed, humanReview, currentIssueId, currentPhase, addToQueue, getCachedIssue, cacheIssue, settings, updateSettings, status, projectPath } =
    useAutoBuildStore();
  const [showNewIssuePopup, setShowNewIssuePopup] = useState(false);
  const [showTestingSettings, setShowTestingSettings] = useState(false);
  const [showEpicQueue, setShowEpicQueue] = useState(false);

  const isWorking = status === "running" && currentPhase === "working";

  // Available epics that can be queued
  const availableEpics = useMemo(() => {
    return issues.filter(
      (i) => i.issue_type === "epic" && i.status === "open"
    );
  }, [issues]);

  // Build columns (without Completed - it's now a compact list)
  const columns = useMemo<KanbanColumn[]>(() => {
    // Backlog: Issues in queue (not current)
    const backlogIssues = queue
      .filter((id) => id !== currentIssueId)
      .map((id) => issues.find((i) => i.id === id) || getCachedIssue(id))
      .filter((i): i is BeadsIssue => !!i);

    // Doing: Current issue in working phase
    const doingIssues =
      currentIssueId && currentPhase === "working"
        ? [issues.find((i) => i.id === currentIssueId) || getCachedIssue(currentIssueId)].filter(
            (i): i is BeadsIssue => !!i
          )
        : [];

    // Testing: Current issue in testing/fixing/committing phase
    const testingIssues =
      currentIssueId && (currentPhase === "testing" || currentPhase === "fixing" || currentPhase === "committing")
        ? [issues.find((i) => i.id === currentIssueId) || getCachedIssue(currentIssueId)].filter(
            (i): i is BeadsIssue => !!i
          )
        : [];

    // Human Review: Issues awaiting approval
    const reviewIssues = humanReview
      .map((id) => issues.find((i) => i.id === id) || getCachedIssue(id))
      .filter((i): i is BeadsIssue => !!i);

    return [
      {
        id: "backlog",
        title: "Backlog",
        icon: <Inbox className="h-4 w-4" />,
        color: "bg-blue-500",
        items: backlogIssues,
        emptyMessage: "Add issues to queue",
      },
      {
        id: "doing",
        title: "Doing",
        icon: <Loader2 className="h-4 w-4" />,
        color: "bg-amber-500",
        items: doingIssues,
        emptyMessage: "No active work",
      },
      {
        id: "testing",
        title: "Testing",
        icon: <FlaskConical className="h-4 w-4" />,
        color: "bg-purple-500",
        items: testingIssues,
        emptyMessage: "No tests running",
      },
      {
        id: "review",
        title: "Human Review",
        icon: <Eye className="h-4 w-4" />,
        color: "bg-orange-500",
        items: reviewIssues,
        emptyMessage: "No reviews pending",
      },
    ];
  }, [queue, humanReview, currentIssueId, currentPhase, issues, getCachedIssue]);

  // Completed issues for compact list
  const completedIssues = useMemo(() => {
    return completed
      .slice(-5) // Show last 5
      .reverse() // Most recent first
      .map((id) => issues.find((i) => i.id === id) || getCachedIssue(id))
      .filter((i): i is BeadsIssue => !!i);
  }, [completed, issues, getCachedIssue]);

  // Available issues that can be added to queue (open, not epic, not already in queue/review/completed)
  const availableIssues = useMemo(() => {
    return issues.filter(
      (i) =>
        i.status === "open" &&
        i.issue_type !== "epic" &&
        !queue.includes(i.id) &&
        !humanReview.includes(i.id) &&
        !completed.includes(i.id)
    );
  }, [issues, queue, humanReview, completed]);

  return (
    <>
      <div className="flex h-full gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "flex min-w-[200px] flex-col rounded-lg border border-border bg-bg-secondary",
              column.id === "review" ? "w-[280px]" : "w-1/4"
            )}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <div className={cn("rounded p-1", column.color + "/20")}>
                <span className={cn(
                  column.color.replace("bg-", "text-"),
                  column.id === "doing" && isWorking && "[&>svg]:animate-spin"
                )}>
                  {column.icon}
                </span>
              </div>
              <span className="font-medium">{column.title}</span>
              <span className="ml-auto text-sm text-text-secondary">{column.items.length}</span>
              {column.id === "backlog" && (
                <>
                  {availableEpics.length > 0 && (
                    <Tooltip content="Queue epic">
                      <button
                        onClick={() => setShowEpicQueue(true)}
                        className="ml-1 rounded p-1 text-text-secondary transition-colors hover:bg-purple-500/20 hover:text-purple-400"
                      >
                        <Layers className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Create new issue">
                    <button
                      onClick={() => setShowNewIssuePopup(true)}
                      className="ml-1 rounded p-1 text-text-secondary transition-colors hover:bg-accent/20 hover:text-accent"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </>
              )}
              {column.id === "testing" && (
                <Tooltip content="Verification settings">
                  <button
                    onClick={() => setShowTestingSettings(!showTestingSettings)}
                    className={cn(
                      "ml-1 rounded p-1 transition-colors",
                      showTestingSettings
                        ? "bg-accent/20 text-accent"
                        : "text-text-secondary hover:bg-accent/20 hover:text-accent"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </div>

            {/* Column Content */}
            <OverlayScrollbarsComponent
              className="flex-1"
              options={{ scrollbars: { autoHide: "scroll" } }}
            >
              <div className="flex flex-col gap-2 p-2">
                {column.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-text-secondary">
                    <span>{column.emptyMessage}</span>
                  </div>
                ) : (
                  column.items.map((issue) => (
                    <AutoBuildIssueCard
                      key={issue.id}
                      issue={issue}
                      isActive={issue.id === currentIssueId}
                      columnId={column.id}
                    />
                  ))
                )}

              </div>

              {/* Compact Completed List under Human Review */}
              {column.id === "review" && (
                <CompactCompletedList issues={completedIssues} totalCount={completed.length} />
              )}
            </OverlayScrollbarsComponent>

            {/* Fixed Add button at bottom for backlog column */}
            {column.id === "backlog" && availableIssues.length > 0 && (
              <div className="shrink-0 border-t border-border p-2">
                <AddIssueDropdown issues={availableIssues} onAdd={addToQueue} />
              </div>
            )}

            {/* Testing Settings Popup */}
            {column.id === "testing" && showTestingSettings && (
              <TestingSettingsPopup
                settings={settings}
                onUpdate={updateSettings}
                onClose={() => setShowTestingSettings(false)}
              />
            )}
          </div>
        ))}
      </div>

      {showNewIssuePopup && (
        <AutoBuildNewIssuePopup onClose={() => setShowNewIssuePopup(false)} />
      )}

      {showEpicQueue && (
        <EpicQueuePopup
          epics={availableEpics}
          issues={issues}
          projectPath={projectPath}
          onQueue={(childIssues) => {
            // Cache and add all child issues
            childIssues.forEach((issue) => {
              cacheIssue(issue);
              addToQueue(issue.id);
            });
            setShowEpicQueue(false);
          }}
          onClose={() => setShowEpicQueue(false)}
        />
      )}
    </>
  );
}

interface AddIssueDropdownProps {
  issues: BeadsIssue[];
  onAdd: (id: string) => void;
}

function AddIssueDropdown({ issues, onAdd }: AddIssueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Dropdown - appears above */}
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-64 overflow-auto rounded-lg border border-border bg-bg-primary shadow-xl">
            <div className="sticky top-0 border-b border-border bg-bg-primary px-3 py-2 text-xs font-medium text-text-secondary">
              Open Issues ({issues.length})
            </div>
            {issues.slice(0, 15).map((issue) => (
              <button
                key={issue.id}
                onClick={() => {
                  onAdd(issue.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/10"
              >
                <span className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-xs",
                  TYPE_COLORS[issue.issue_type]
                )}>
                  {issue.issue_type}
                </span>
                <span className="line-clamp-2 flex-1">{issue.title}</span>
              </button>
            ))}
            {issues.length > 15 && (
              <div className="border-t border-border px-3 py-2 text-center text-xs text-text-secondary">
                +{issues.length - 15} more issues available
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded border border-dashed py-2.5 text-sm transition-colors",
          isOpen
            ? "border-accent bg-accent/10 text-accent"
            : "border-border text-text-secondary hover:border-accent hover:text-accent"
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add from Backlog</span>
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
          {issues.length}
        </span>
      </button>
    </div>
  );
}

interface CompactCompletedListProps {
  issues: BeadsIssue[];
  totalCount: number;
}

function CompactCompletedList({ issues, totalCount }: CompactCompletedListProps) {
  if (totalCount === 0) return null;

  return (
    <div className="mx-2 mb-2 mt-4 border-t border-border/50 pt-3">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs text-text-secondary">
        <CheckCircle2 className="h-3 w-3 text-green-400" />
        <span>Recently Completed ({totalCount})</span>
      </div>
      <div className="space-y-1">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-bg-primary/50"
          >
            <Check className="h-3 w-3 shrink-0 text-green-400" />
            <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px]", TYPE_COLORS[issue.issue_type])}>
              {issue.issue_type}
            </span>
            <span className="truncate text-text-secondary">{issue.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TestingSettingsPopupProps {
  settings: AutoBuildSettings;
  onUpdate: (settings: Partial<AutoBuildSettings>) => void;
  onClose: () => void;
}

function TestingSettingsPopup({ settings, onUpdate, onClose }: TestingSettingsPopupProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Popup */}
      <div className="absolute left-2 right-2 top-12 z-20 rounded-lg border border-border bg-bg-primary p-3 shadow-xl">
        <div className="mb-2 text-xs font-medium text-text-secondary">Verification Steps</div>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-bg-secondary">
            <input
              type="checkbox"
              checked={settings.runLint}
              onChange={(e) => onUpdate({ runLint: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border bg-bg-secondary accent-accent"
            />
            <span>Run Lint</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-bg-secondary">
            <input
              type="checkbox"
              checked={settings.runTests}
              onChange={(e) => onUpdate({ runTests: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border bg-bg-secondary accent-accent"
            />
            <span>Run Tests</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-bg-secondary">
            <input
              type="checkbox"
              checked={settings.runBuild}
              onChange={(e) => onUpdate({ runBuild: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border bg-bg-secondary accent-accent"
            />
            <span>Run Build</span>
          </label>
        </div>
      </div>
    </>
  );
}

interface EpicQueuePopupProps {
  epics: BeadsIssue[];
  issues: BeadsIssue[];
  projectPath: string | null;
  onQueue: (childIssues: BeadsIssue[]) => void;
  onClose: () => void;
}

function EpicQueuePopup({ epics, issues, projectPath, onQueue, onClose }: EpicQueuePopupProps) {
  const [selectedEpic, setSelectedEpic] = useState<BeadsIssue | null>(null);
  const [childIssues, setChildIssues] = useState<BeadsIssue[]>([]);
  const [autoAssignPhases, setAutoAssignPhases] = useState(true);
  const [issuesPerPhase, setIssuesPerPhase] = useState(3);
  const [loading, setLoading] = useState(false);

  // Get child issues for selected epic
  const getChildIssues = (epic: BeadsIssue) => {
    // Find issues that have this epic as parent via dependencies
    return issues.filter((issue) => {
      if (issue.issue_type === "epic") return false;
      if (!issue.dependencies) return false;
      return issue.dependencies.some(
        (dep) => dep.depends_on_id === epic.id && dep.type === "parent-child"
      );
    }).sort((a, b) => {
      // Sort by existing phase, then priority, then created_at
      const phaseA = a.phase ?? 999;
      const phaseB = b.phase ?? 999;
      if (phaseA !== phaseB) return phaseA - phaseB;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.created_at.localeCompare(b.created_at);
    });
  };

  const handleSelectEpic = (epic: BeadsIssue) => {
    setSelectedEpic(epic);
    setChildIssues(getChildIssues(epic));
  };

  const handleQueue = async () => {
    if (!selectedEpic || childIssues.length === 0 || !projectPath) return;

    setLoading(true);

    try {
      // Auto-assign phases if enabled
      if (autoAssignPhases) {
        for (let i = 0; i < childIssues.length; i++) {
          const phase = Math.floor(i / issuesPerPhase) + 1;
          const issue = childIssues[i];
          if (issue.phase !== phase) {
            await invoke("beads_update_phase", {
              projectPath,
              id: issue.id,
              phase,
            });
            issue.phase = phase;
          }
        }
      }

      onQueue(childIssues);
    } catch (err) {
      console.error("Failed to queue epic:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg border border-border bg-bg-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            <span className="font-medium">Queue Epic</span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-auto p-4">
          {!selectedEpic ? (
            // Epic selection
            <div className="space-y-2">
              <div className="mb-3 text-sm text-text-secondary">Select an epic to queue its child issues:</div>
              {epics.map((epic) => {
                const children = getChildIssues(epic);
                return (
                  <button
                    key={epic.id}
                    onClick={() => handleSelectEpic(epic)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-purple-500/50 hover:bg-purple-500/5"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{epic.title}</div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {children.length} child issue{children.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  </button>
                );
              })}
            </div>
          ) : (
            // Child issues preview
            <div className="space-y-4">
              <button
                onClick={() => setSelectedEpic(null)}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to epics
              </button>

              <div>
                <div className="mb-2 font-medium">{selectedEpic.title}</div>
                <div className="text-sm text-text-secondary">
                  {childIssues.length} issue{childIssues.length !== 1 ? "s" : ""} will be added to the queue
                </div>
              </div>

              {/* Phase assignment options */}
              <div className="rounded-lg border border-border bg-bg-secondary p-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoAssignPhases}
                    onChange={(e) => setAutoAssignPhases(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-purple-500"
                  />
                  <span className="text-sm">Auto-assign phases</span>
                </label>
                {autoAssignPhases && (
                  <div className="mt-2 flex items-center gap-2 pl-6 text-sm">
                    <span className="text-text-secondary">Issues per phase:</span>
                    <select
                      value={issuesPerPhase}
                      onChange={(e) => setIssuesPerPhase(parseInt(e.target.value))}
                      className="rounded border border-border bg-bg-primary px-2 py-1 text-sm"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Child issues list */}
              <div className="space-y-1">
                {childIssues.map((issue, index) => {
                  const phase = autoAssignPhases
                    ? Math.floor(index / issuesPerPhase) + 1
                    : issue.phase;
                  return (
                    <div
                      key={issue.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-bg-secondary"
                    >
                      {phase && (
                        <span className="shrink-0 rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                          P{phase}
                        </span>
                      )}
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs", TYPE_COLORS[issue.issue_type])}>
                        {issue.issue_type}
                      </span>
                      <span className="truncate">{issue.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedEpic && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleQueue}
              disabled={childIssues.length === 0 || loading}
              className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Queue {childIssues.length} Issue{childIssues.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

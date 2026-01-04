import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  Zap,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Copy,
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import { IssueDetailPopup } from "./IssueDetailPopup";
import type {
  BeadsIssue,
  BeadsStatus,
  BeadsIssueType,
} from "@/types/beads";
import {
  STATUS_COLORS,
  TYPE_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/types/beads";

interface IssuesTabProps {
  onCreateIssue: () => void;
}

function PhaseSelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (phase: number | undefined) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? undefined : parseInt(val, 10));
      }}
      className={cn(
        "appearance-none px-2 py-0.5 text-xs rounded border cursor-pointer",
        value
          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
          : "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
      )}
    >
      <option value="">-</option>
      <option value="1">P1</option>
      <option value="2">P2</option>
      <option value="3">P3</option>
      <option value="4">P4</option>
      <option value="5">P5</option>
    </select>
  );
}

export function IssuesTab({ onCreateIssue }: IssuesTabProps) {
  const { issues, loading, fetchIssues, updateIssue, closeIssue, reopenIssue } =
    useBeadsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BeadsStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<BeadsIssueType | "all">("all");
  const [hideClosed, setHideClosed] = useState(true);
  const [hideTombstones, setHideTombstones] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<BeadsIssue | null>(null);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Hide closed filter - hides closed issues WITHOUT a close_reason (soft closed)
      if (hideClosed && issue.status === "closed" && !issue.close_reason) return false;
      // Hide tombstones filter - hides closed issues WITH a close_reason (permanently resolved)
      if (hideTombstones && issue.status === "closed" && issue.close_reason) return false;
      if (statusFilter !== "all" && issue.status !== statusFilter) return false;
      if (typeFilter !== "all" && issue.issue_type !== typeFilter) return false;
      if (
        search &&
        !issue.title.toLowerCase().includes(search.toLowerCase()) &&
        !issue.id.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [issues, statusFilter, typeFilter, search, hideClosed, hideTombstones]);

  const handleClose = async (id: string) => {
    if (!closeReason.trim()) return;
    try {
      await closeIssue(id, closeReason);
      setClosingId(null);
      setCloseReason("");
    } catch (err) {
      console.error("Failed to close issue:", err);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await reopenIssue(id);
    } catch (err) {
      console.error("Failed to reopen issue:", err);
    }
  };

  const handleStatusChange = async (issue: BeadsIssue, newStatus: BeadsStatus) => {
    if (newStatus === "closed") {
      setClosingId(issue.id);
      return;
    }
    try {
      await updateIssue(issue.id, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BeadsStatus | "all")}
            className="appearance-none bg-bg-tertiary border border-border rounded-md px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="closed">Closed</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        </div>

        {/* Type Filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as BeadsIssueType | "all")}
            className="appearance-none bg-bg-tertiary border border-border rounded-md px-3 py-1.5 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All types</option>
            <option value="task">Task</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug</option>
            <option value="epic">Epic</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-bg-tertiary border border-border rounded-md pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Actions */}
        <Tooltip content="Refresh">
          <IconButton size="sm" onClick={() => fetchIssues()} disabled={loading} aria-label="Refresh issues">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Create Issue">
          <IconButton size="sm" onClick={onCreateIssue} aria-label="Create new issue">
            <Plus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>

      {/* Table */}
      <OverlayScrollbarsComponent
        className="flex-1 os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-bg-secondary z-10">
            <tr className="text-left text-xs text-text-secondary border-b border-border">
              <th className="px-4 py-2 font-medium w-24">ID</th>
              <th className="px-4 py-2 font-medium w-24">Type</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium w-28">Status</th>
              <th className="px-4 py-2 font-medium w-20">Phase</th>
              <th className="px-4 py-2 font-medium w-24">Priority</th>
              <th className="px-4 py-2 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                  {loading ? "Loading issues..." : "No issues found"}
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => (
                <tr
                  key={issue.id}
                  className="border-b border-border/50 hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-text-secondary">
                      #{issue.id.split("-").pop()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-0.5 text-xs rounded border capitalize",
                        TYPE_COLORS[issue.issue_type]
                      )}
                    >
                      {issue.issue_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-primary">{issue.title}</span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {closingId === issue.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={closeReason}
                          onChange={(e) => setCloseReason(e.target.value)}
                          placeholder="Reason..."
                          className="w-20 bg-bg-tertiary border border-border rounded px-1.5 py-0.5 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleClose(issue.id);
                            if (e.key === "Escape") {
                              setClosingId(null);
                              setCloseReason("");
                            }
                          }}
                        />
                        <IconButton
                          size="sm"
                          onClick={() => handleClose(issue.id)}
                          aria-label="Confirm close issue"
                          className="text-green-400"
                        >
                          <Check className="w-3 h-3" />
                        </IconButton>
                        <IconButton
                          size="sm"
                          onClick={() => {
                            setClosingId(null);
                            setCloseReason("");
                          }}
                          aria-label="Cancel close issue"
                        >
                          <X className="w-3 h-3" />
                        </IconButton>
                      </div>
                    ) : issue.status === "closed" && issue.close_reason ? (
                      // Tombstone - show non-editable badge
                      <span
                        className="px-2 py-0.5 text-xs rounded border bg-neutral-600/30 text-neutral-300 border-neutral-500/40"
                      >
                        Tombstone
                      </span>
                    ) : (
                      <select
                        value={issue.status}
                        onChange={(e) =>
                          handleStatusChange(issue, e.target.value as BeadsStatus)
                        }
                        className={cn(
                          "appearance-none px-2 py-0.5 text-xs rounded border cursor-pointer",
                          STATUS_COLORS[issue.status]
                        )}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="closed">Closed</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <PhaseSelector
                      value={issue.phase}
                      onChange={(phase) => updateIssue(issue.id, { phase })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Zap className={cn("w-3 h-3", PRIORITY_COLORS[issue.priority])} />
                      <span className={cn("text-xs", PRIORITY_COLORS[issue.priority])}>
                        {PRIORITY_LABELS[issue.priority]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Tooltip content={copiedId === issue.id ? "Copied!" : "Copy ID"}>
                        <IconButton
                          size="sm"
                          onClick={() => handleCopyId(issue.id)}
                          aria-label="Copy issue ID"
                          className={cn(
                            "transition-colors",
                            copiedId === issue.id
                              ? "text-green-400"
                              : "text-text-secondary hover:text-text-primary"
                          )}
                        >
                          {copiedId === issue.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </IconButton>
                      </Tooltip>
                      {issue.status === "closed" && (
                        <Tooltip content="Reopen">
                          <IconButton
                            size="sm"
                            onClick={() => handleReopen(issue.id)}
                            aria-label="Reopen issue"
                            className="text-amber-400 hover:bg-amber-500/10"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </OverlayScrollbarsComponent>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary flex items-center justify-between">
        <span>
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
          {filteredIssues.length !== issues.length
            ? ` (filtered from ${issues.length})`
            : ""}
        </span>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideClosed}
              onChange={(e) => setHideClosed(e.target.checked)}
              className="w-3 h-3 rounded border-border bg-bg-tertiary accent-accent cursor-pointer"
            />
            <span>Hide closed</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideTombstones}
              onChange={(e) => setHideTombstones(e.target.checked)}
              className="w-3 h-3 rounded border-border bg-bg-tertiary accent-accent cursor-pointer"
            />
            <span>Hide tombstones</span>
          </label>
        </div>
      </div>

      {/* Issue Detail Popup */}
      {selectedIssue && (
        <IssueDetailPopup
          issue={selectedIssue}
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

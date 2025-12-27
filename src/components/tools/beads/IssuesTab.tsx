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
} from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
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

export function IssuesTab({ onCreateIssue }: IssuesTabProps) {
  const { issues, loading, fetchIssues, updateIssue, closeIssue, reopenIssue } =
    useBeadsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BeadsStatus | "all">("open");
  const [typeFilter, setTypeFilter] = useState<BeadsIssueType | "all">("all");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeReason, setCloseReason] = useState("");

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
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
  }, [issues, statusFilter, typeFilter, search]);

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
          <IconButton size="sm" onClick={() => fetchIssues()} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </IconButton>
        </Tooltip>
        <Tooltip content="Create Issue">
          <IconButton size="sm" onClick={onCreateIssue}>
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
              <th className="px-4 py-2 font-medium w-28">Assignee</th>
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
                  className="border-b border-border/50 hover:bg-bg-tertiary/30 transition-colors"
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
                  <td className="px-4 py-3">
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
                        >
                          <X className="w-3 h-3" />
                        </IconButton>
                      </div>
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
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary">
                      {issue.assignee || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Zap className={cn("w-3 h-3", PRIORITY_COLORS[issue.priority])} />
                      <span className={cn("text-xs", PRIORITY_COLORS[issue.priority])}>
                        {PRIORITY_LABELS[issue.priority]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {issue.status === "closed" && (
                      <Tooltip content="Reopen">
                        <IconButton
                          size="sm"
                          onClick={() => handleReopen(issue.id)}
                          className="text-amber-400 hover:bg-amber-500/10"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </OverlayScrollbarsComponent>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary">
        {filteredIssues.length} issue{filteredIssues.length !== 1 ? "s" : ""}
        {statusFilter !== "all" || typeFilter !== "all" || search
          ? ` (filtered from ${issues.length})`
          : ""}
      </div>
    </div>
  );
}

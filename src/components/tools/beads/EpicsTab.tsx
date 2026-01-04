import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Zap, Search, Copy, Check, Info } from "lucide-react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import { IssueDetailPopup } from "./IssueDetailPopup";
import type { BeadsIssue } from "@/types/beads";
import {
  STATUS_COLORS,
  TYPE_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/types/beads";
import { IconButton, Tooltip } from "@/components/ui";

interface Epic {
  epic: BeadsIssue;
  children: BeadsIssue[];
  progress: {
    total: number;
    closed: number;
    percentage: number;
  };
}

export function EpicsTab() {
  const { issues } = useBeadsStore();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [hideClosed, setHideClosed] = useState(true);
  const [hideTombstones, setHideTombstones] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<BeadsIssue | null>(null);

  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const epics = useMemo(() => {
    const epicIssues = issues.filter((i) => i.issue_type === "epic");
    const epicMap: Epic[] = [];

    for (const epic of epicIssues) {
      // Find children by checking dependencies for parent-child relationship
      const children = issues.filter((i) => {
        if (i.id === epic.id) return false;
        // Check dependencies array for parent-child link to this epic
        if (i.dependencies?.some(
          (d) => d.type === "parent-child" && d.depends_on_id === epic.id
        )) {
          return true;
        }
        // Fallback: match by ID prefix (e.g., epic-id.1, epic-id.2)
        return (
          i.id.startsWith(epic.id + ".") &&
          !i.id.substring(epic.id.length + 1).includes(".")
        );
      });

      const closedCount = children.filter((c) => c.status === "closed").length;
      epicMap.push({
        epic,
        children,
        progress: {
          total: children.length,
          closed: closedCount,
          percentage: children.length > 0 ? (closedCount / children.length) * 100 : 0,
        },
      });
    }

    return epicMap;
  }, [issues]);

  const filteredEpics = useMemo(() => {
    return epics.filter((e) => {
      // Hide closed filter - hides closed epics WITHOUT a close_reason (soft closed)
      if (hideClosed && e.epic.status === "closed" && !e.epic.close_reason) return false;
      // Hide tombstones filter - hides closed epics WITH a close_reason (permanently resolved)
      if (hideTombstones && e.epic.status === "closed" && e.epic.close_reason) return false;
      if (
        search &&
        !e.epic.title.toLowerCase().includes(search.toLowerCase()) &&
        !e.epic.id.toLowerCase().includes(search.toLowerCase())
      ) return false;
      return true;
    });
  }, [epics, hideClosed, hideTombstones, search]);

  const toggleExpanded = (epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or ID..."
            className="w-full bg-bg-tertiary border border-border rounded-md pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <OverlayScrollbarsComponent
        className="flex-1 os-theme-custom"
        options={{ scrollbars: { theme: "os-theme-custom", autoHide: "scroll" } }}
      >
        {filteredEpics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-secondary">
            {epics.length === 0 ? "No epics found" : "No open epics"}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredEpics.map(({ epic, children, progress }) => {
              const isExpanded = expandedEpics.has(epic.id);

              return (
                <div
                  key={epic.id}
                  className="rounded-lg border border-border bg-bg-tertiary/30 overflow-hidden"
                >
                  {/* Epic Header */}
                  <div className="flex items-center gap-3 p-4 hover:bg-bg-tertiary/50 transition-colors">
                    {/* Expandable area */}
                    <button
                      onClick={() => toggleExpanded(epic.id)}
                      className="flex-1 flex items-center gap-3"
                    >
                      {/* Expand Icon */}
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-secondary" />
                        )}
                      </div>

                      {/* Epic Badge */}
                      <span
                        className={cn(
                          "flex-shrink-0 px-2 py-0.5 text-xs rounded border",
                          TYPE_COLORS.epic
                        )}
                      >
                        Epic
                      </span>

                      {/* Title */}
                      <span className="flex-1 text-left text-sm font-medium text-text-primary truncate">
                        {epic.title}
                      </span>

                      {/* Status Badge - show Tombstone for closed with close_reason */}
                      <span
                        className={cn(
                          "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                          epic.status === "closed" && epic.close_reason
                            ? "bg-neutral-600/30 text-neutral-300 border-neutral-500/40"
                            : STATUS_COLORS[epic.status]
                        )}
                      >
                        {epic.status === "closed" && epic.close_reason
                          ? "Tombstone"
                          : epic.status.replace("_", " ")}
                      </span>

                      {/* Progress Bar */}
                      <div className="flex-shrink-0 w-32 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary w-12 text-right">
                          {progress.closed}/{progress.total}
                        </span>
                      </div>
                    </button>

                    {/* View Details Button */}
                    <Tooltip content="View details">
                      <IconButton
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIssue(epic);
                        }}
                        aria-label="View epic details"
                        className="flex-shrink-0 text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>

                    {/* Copy ID Button */}
                    <Tooltip content={copiedId === epic.id ? "Copied!" : "Copy ID"}>
                      <IconButton
                        size="sm"
                        onClick={(e) => handleCopyId(epic.id, e)}
                        aria-label="Copy epic ID"
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          copiedId === epic.id
                            ? "text-green-400"
                            : "text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {copiedId === epic.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </div>

                  {/* Children */}
                  {isExpanded && children.length > 0 && (
                    <div className="border-t border-border/50 divide-y divide-border/30">
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-bg-tertiary/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedIssue(child)}
                        >
                          {/* Type Badge */}
                          <span
                            className={cn(
                              "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                              TYPE_COLORS[child.issue_type]
                            )}
                          >
                            {child.issue_type}
                          </span>

                          {/* Title */}
                          <span className="flex-1 text-sm text-text-primary truncate">
                            {child.title}
                          </span>

                          {/* Status */}
                          <span
                            className={cn(
                              "flex-shrink-0 px-2 py-0.5 text-xs rounded border capitalize",
                              STATUS_COLORS[child.status]
                            )}
                          >
                            {child.status.replace("_", " ")}
                          </span>

                          {/* Priority */}
                          <div className="flex-shrink-0 flex items-center gap-1">
                            <Zap
                              className={cn("w-3 h-3", PRIORITY_COLORS[child.priority])}
                            />
                            <span
                              className={cn(
                                "text-xs",
                                PRIORITY_COLORS[child.priority]
                              )}
                            >
                              {PRIORITY_LABELS[child.priority]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No children message */}
                  {isExpanded && children.length === 0 && (
                    <div className="border-t border-border/50 px-4 py-3 pl-12 text-sm text-text-secondary">
                      No child issues
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </OverlayScrollbarsComponent>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary flex items-center justify-between">
        <span>
          {filteredEpics.length} epic{filteredEpics.length !== 1 ? "s" : ""}
          {filteredEpics.length !== epics.length
            ? ` (filtered from ${epics.length})`
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

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  Zap,
  Calendar,
  Edit3,
  Save,
  Tag,
  Link2,
} from "lucide-react";
import { IconButton, Tooltip } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useBeadsStore } from "@/stores/beadsStore";
import type { BeadsIssue } from "@/types/beads";
import {
  STATUS_COLORS,
  TYPE_COLORS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
} from "@/types/beads";

interface IssueDetailPopupProps {
  issue: BeadsIssue;
  isOpen: boolean;
  onClose: () => void;
}

export function IssueDetailPopup({
  issue,
  isOpen,
  onClose,
}: IssueDetailPopupProps) {
  const { updateIssue } = useBeadsStore();
  const [copiedId, setCopiedId] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(
    issue.description || ""
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(issue.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      await updateIssue(issue.id, { description: descriptionDraft });
      setIsEditingDescription(false);
    } catch (err) {
      console.error("Failed to save description:", err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-bg-secondary border border-border rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded border capitalize",
                TYPE_COLORS[issue.issue_type]
              )}
            >
              {issue.issue_type}
            </span>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors font-mono"
            >
              #{issue.id.split("-").pop()}
              {copiedId ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <IconButton size="sm" onClick={onClose} aria-label="Close issue detail">
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <h2 className="text-lg font-semibold text-text-primary">
            {issue.title}
          </h2>

          {/* Status & Priority Row */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "px-2.5 py-1 text-xs rounded border capitalize",
                STATUS_COLORS[issue.status]
              )}
            >
              {issue.status.replace("_", " ")}
            </span>
            <div className="flex items-center gap-1.5">
              <Zap className={cn("w-4 h-4", PRIORITY_COLORS[issue.priority])} />
              <span
                className={cn("text-sm", PRIORITY_COLORS[issue.priority])}
              >
                {PRIORITY_LABELS[issue.priority]}
              </span>
            </div>
            {issue.phase && (
              <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Phase {issue.phase}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-secondary">
                Description
              </h3>
              {!isEditingDescription && (
                <Tooltip content="Edit description">
                  <IconButton
                    size="sm"
                    onClick={() => {
                      setDescriptionDraft(issue.description || "");
                      setIsEditingDescription(true);
                    }}
                    aria-label="Edit description"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  placeholder="Add a description..."
                  className="w-full min-h-[120px] bg-bg-tertiary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-primary-950 rounded hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-tertiary/50 rounded-md p-3 text-sm text-text-primary min-h-[60px]">
                {issue.description ? (
                  <p className="whitespace-pre-wrap">{issue.description}</p>
                ) : (
                  <p className="text-text-secondary italic">No description</p>
                )}
              </div>
            )}
          </div>

          {/* Close Reason (if closed) */}
          {issue.status === "closed" && issue.close_reason && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary">
                Close Reason
              </h3>
              <div className="bg-neutral-500/10 rounded-md p-3 text-sm text-text-primary">
                {issue.close_reason}
              </div>
            </div>
          )}

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Labels
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-primary border border-border"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {issue.dependencies && issue.dependencies.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Dependencies
              </h3>
              <div className="space-y-1">
                {issue.dependencies.map((dep) => (
                  <div
                    key={`${dep.issue_id}-${dep.depends_on_id}`}
                    className="flex items-center gap-2 text-xs text-text-secondary"
                  >
                    <span className="capitalize px-1.5 py-0.5 rounded bg-bg-tertiary border border-border">
                      {dep.type.replace("-", " ")}
                    </span>
                    <span className="font-mono">
                      #{dep.depends_on_id.split("-").pop()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Calendar className="w-3.5 h-3.5" />
              <span>Created: {formatDate(issue.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Calendar className="w-3.5 h-3.5" />
              <span>Updated: {formatDate(issue.updated_at)}</span>
            </div>
            {issue.closed_at && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Calendar className="w-3.5 h-3.5" />
                <span>Closed: {formatDate(issue.closed_at)}</span>
              </div>
            )}
            {issue.assignee && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span>Assignee: {issue.assignee}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

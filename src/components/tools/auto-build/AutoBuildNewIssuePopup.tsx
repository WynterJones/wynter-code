import { useState, useCallback, useEffect } from "react";
import { X, Bug, Sparkles, CheckSquare, AlertCircle } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useBeadsStore } from "@/stores/beadsStore";
import { useAutoBuildStore } from "@/stores/autoBuildStore";
import { cn } from "@/lib/utils";
import type { BeadsIssueType } from "@/types/beads";
import { PRIORITY_LABELS, PRIORITY_COLORS } from "@/types/beads";

interface AutoBuildNewIssuePopupProps {
  onClose: () => void;
}

const ISSUE_TYPES: { type: BeadsIssueType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "task", label: "Task", icon: <CheckSquare className="h-4 w-4" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
  { type: "feature", label: "Feature", icon: <Sparkles className="h-4 w-4" />, color: "bg-green-500/20 text-green-400 border-green-500/50" },
  { type: "bug", label: "Bug", icon: <Bug className="h-4 w-4" />, color: "bg-red-500/20 text-red-400 border-red-500/50" },
];

export function AutoBuildNewIssuePopup({ onClose }: AutoBuildNewIssuePopupProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<BeadsIssueType>("task");
  const [priority, setPriority] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createIssue, fetchIssues } = useBeadsStore();
  const { addToQueue, cacheIssue } = useAutoBuildStore();

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const issueId = await createIssue(title.trim(), issueType, priority, description.trim() || undefined);

      await fetchIssues();

      const issues = useBeadsStore.getState().issues;
      const newIssue = issues.find(i => i.id === issueId);
      if (newIssue) {
        cacheIssue(newIssue);
      }

      addToQueue(issueId);

      onClose();
    } catch (err) {
      setError(String(err));
      setIsSubmitting(false);
    }
  }, [title, description, issueType, priority, createIssue, fetchIssues, addToQueue, cacheIssue, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSubmit]);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative flex flex-col rounded-xl border border-border bg-bg-primary shadow-2xl animate-in zoom-in-95 duration-100"
        style={{ width: "600px", maxHeight: "80vh" }}
      >
        <div
          data-tauri-drag-region
          className="flex items-center justify-between border-b border-border px-5 py-4 cursor-grab active:cursor-grabbing"
        >
          <h3 className="text-lg font-semibold" data-tauri-drag-region>New Issue</h3>
          <IconButton size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-auto p-5">
          <div>
            <label htmlFor="autobuild-issue-title" className="mb-2 block text-sm font-medium text-text-secondary">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="autobuild-issue-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-3 text-base placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Type
              </span>
              <div className="flex gap-2">
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setIssueType(t.type)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                      issueType === t.type
                        ? t.color + " border-current"
                        : "border-border text-text-secondary hover:border-text-secondary hover:text-text-primary"
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-40">
              <label htmlFor="autobuild-issue-priority" className="mb-2 block text-sm font-medium text-text-secondary">
                Priority
              </label>
              <select
                id="autobuild-issue-priority"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {[0, 1, 2, 3, 4].map((p) => (
                  <option key={p} value={p}>
                    P{p} - {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
              <div className={cn("mt-1 text-xs", PRIORITY_COLORS[priority])}>
                {priority === 0 && "Drop everything"}
                {priority === 1 && "Do it soon"}
                {priority === 2 && "Normal priority"}
                {priority === 3 && "When you have time"}
                {priority === 4 && "Nice to have"}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <label htmlFor="autobuild-issue-description" className="mb-2 block text-sm font-medium text-text-secondary">
              Description
              <span className="ml-2 text-xs text-text-secondary/60">(Markdown supported)</span>
            </label>
            <textarea
              id="autobuild-issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail...

- What should be done?
- What's the expected behavior?
- Any technical details?"
              className="h-48 w-full resize-none rounded-lg border border-border bg-bg-secondary px-4 py-3 font-mono text-sm placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-bg-secondary/50 px-5 py-4">
          <div className="text-xs text-text-secondary">
            Issue will be added to backlog
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
                isSubmitting || !title.trim()
                  ? "cursor-not-allowed bg-accent/20 text-accent/50"
                  : "bg-accent text-white hover:bg-accent/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>Create Issue</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  X,
  Github,
  Lock,
  Unlock,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useGitHubManagerStore } from "@/stores/githubManagerStore";
import { cn } from "@/lib/utils";

interface ConnectWorkflowProps {
  projectPath: string;
  onClose: () => void;
}

export function ConnectWorkflow({ projectPath, onClose }: ConnectWorkflowProps) {
  const { createAndConnectRepo, createLoading } = useGitHubManagerStore();

  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [pushImmediately, setPushImmediately] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
    repoUrl?: string;
  } | null>(null);

  // Auto-populate repo name from folder name
  useEffect(() => {
    const folderName = projectPath.split("/").pop() || "";
    // Sanitize: GitHub repo names must be alphanumeric with dashes
    const sanitized = folderName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
    setRepoName(sanitized);
  }, [projectPath]);

  const handleCreate = async () => {
    if (!repoName.trim()) return;

    const result = await createAndConnectRepo({
      name: repoName.trim(),
      description: description.trim() || undefined,
      isPrivate,
      sourcePath: projectPath,
      push: pushImmediately,
    });

    setResult(result);
  };

  const isValid = repoName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-black/80">
      <div className="w-[480px] bg-bg-primary rounded-xl border border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-accent" />
            <span className="font-medium text-text-primary">
              Create GitHub Repository
            </span>
          </div>
          <IconButton size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Success state */}
          {result?.success && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-green-400 font-medium">
                    Repository created successfully!
                  </p>
                  {result.repoUrl && (
                    <a
                      href={result.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      {result.repoUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="block mt-2 px-3 py-1.5 bg-accent text-[#3d2066] rounded text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {result?.error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium">Failed to create repository</p>
                  <p className="text-sm text-red-400/80 mt-1">{result.error}</p>
                  <button
                    onClick={() => setResult(null)}
                    className="mt-2 text-sm text-accent hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!result?.success && (
            <>
              {/* Project path */}
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">
                  Project Path
                </label>
                <div className="px-3 py-2 bg-bg-tertiary rounded-lg text-sm text-text-secondary truncate">
                  {projectPath}
                </div>
              </div>

              {/* Repo name */}
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">
                  Repository Name *
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-awesome-project"
                  className={cn(
                    "w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg",
                    "text-text-primary placeholder:text-text-tertiary",
                    "focus:outline-none focus:border-accent"
                  )}
                  disabled={createLoading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of your project"
                  rows={2}
                  className={cn(
                    "w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg resize-none",
                    "text-text-primary placeholder:text-text-tertiary",
                    "focus:outline-none focus:border-accent"
                  )}
                  disabled={createLoading}
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2">
                  Visibility
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrivate(true)}
                    disabled={createLoading}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                      isPrivate
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-secondary hover:border-border-hover"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(false)}
                    disabled={createLoading}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                      !isPrivate
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-secondary hover:border-border-hover"
                    )}
                  >
                    <Unlock className="w-4 h-4" />
                    Public
                  </button>
                </div>
              </div>

              {/* Push option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushImmediately}
                  onChange={(e) => setPushImmediately(e.target.checked)}
                  disabled={createLoading}
                  className="w-4 h-4 rounded border-border bg-bg-tertiary text-accent focus:ring-accent"
                />
                <div>
                  <span className="text-sm text-text-primary">Push code immediately</span>
                  <p className="text-xs text-text-tertiary">
                    Push all existing code to the new repository
                  </p>
                </div>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        {!result?.success && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <button
              onClick={onClose}
              disabled={createLoading}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!isValid || createLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-accent text-[#3d2066]",
                (!isValid || createLoading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {createLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Create Repository
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

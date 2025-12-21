import { useState } from "react";
import { GitBranch, Plus, Trash2, Check, X, Loader2, Globe } from "lucide-react";
import { CollapsibleSection } from "./CollapsibleSection";
import { IconButton, Input } from "@/components/ui";
import { gitService, type GitBranch as GitBranchType } from "@/services";
import { cn } from "@/lib/utils";

interface BranchSectionProps {
  projectPath: string;
  currentBranch: string;
  branches: GitBranchType[];
  onRefresh: () => void;
}

export function BranchSection({
  projectPath,
  currentBranch,
  branches,
  onRefresh,
}: BranchSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote && !localBranches.some((l) => l.name === b.name));

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    setIsCreatingBranch(true);
    setError(null);

    const result = await gitService.createBranch(projectPath, newBranchName.trim());

    if (result.success) {
      setNewBranchName("");
      setIsCreating(false);
      onRefresh();
    } else {
      setError(result.error || "Failed to create branch");
    }

    setIsCreatingBranch(false);
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;

    setSwitchingBranch(branchName);
    setError(null);

    const result = await gitService.checkoutBranch(projectPath, branchName);

    if (!result.success) {
      setError(result.error || "Failed to switch branch");
    }

    setSwitchingBranch(null);
    onRefresh();
  };

  const handleDeleteBranch = async (branchName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (branchName === currentBranch) {
      setError("Cannot delete current branch");
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Delete branch "${branchName}"?`)) {
      return;
    }

    setDeletingBranch(branchName);
    setError(null);

    const result = await gitService.deleteBranch(projectPath, branchName);

    if (!result.success) {
      // Try force delete if regular delete fails
      if (result.error?.includes("not fully merged")) {
        if (window.confirm(`Branch "${branchName}" is not fully merged. Force delete?`)) {
          const forceResult = await gitService.deleteBranch(projectPath, branchName, true);
          if (!forceResult.success) {
            setError(forceResult.error || "Failed to delete branch");
          }
        }
      } else {
        setError(result.error || "Failed to delete branch");
      }
    }

    setDeletingBranch(null);
    onRefresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateBranch();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewBranchName("");
    }
  };

  return (
    <CollapsibleSection
      title="Branches"
      icon={GitBranch}
      iconColor="text-accent-cyan"
      count={localBranches.length}
      defaultOpen={false}
      actions={
        <IconButton
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsCreating(true);
          }}
          title="Create new branch"
        >
          <Plus className="w-3.5 h-3.5" />
        </IconButton>
      }
    >
      <div className="space-y-1">
        {/* New Branch Input */}
        {isCreating && (
          <div className="flex items-center gap-1 px-2 py-1">
            <Input
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="new-branch-name"
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <IconButton
              size="sm"
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || isCreatingBranch}
            >
              {isCreatingBranch ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3 text-accent-green" />
              )}
            </IconButton>
            <IconButton
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewBranchName("");
              }}
            >
              <X className="w-3 h-3" />
            </IconButton>
          </div>
        )}

        {/* Local Branches */}
        {localBranches.map((branch) => (
          <div
            key={branch.name}
            onClick={() => handleSwitchBranch(branch.name)}
            className={cn(
              "group flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer transition-colors",
              branch.isCurrent
                ? "bg-accent/10 text-accent"
                : "hover:bg-bg-hover text-text-primary"
            )}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {switchingBranch === branch.name ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : branch.isCurrent ? (
                <Check className="w-3 h-3 text-accent" />
              ) : (
                <GitBranch className="w-3 h-3 text-text-secondary" />
              )}
            </span>
            <span className="truncate flex-1 font-mono">{branch.name}</span>
            {!branch.isCurrent && (
              <IconButton
                size="sm"
                onClick={(e) => handleDeleteBranch(branch.name, e)}
                disabled={deletingBranch === branch.name}
                className="opacity-0 group-hover:opacity-100"
              >
                {deletingBranch === branch.name ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 text-accent-red" />
                )}
              </IconButton>
            )}
          </div>
        ))}

        {/* Remote Branches */}
        {remoteBranches.length > 0 && (
          <div className="pt-2">
            <div className="px-2 py-1 text-[10px] font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Remote ({remoteBranches.length})
            </div>
            {remoteBranches.map((branch) => (
              <div
                key={branch.name}
                onClick={() => handleSwitchBranch(branch.name)}
                className="flex items-center gap-2 px-2 py-1 text-xs rounded cursor-pointer hover:bg-bg-hover text-text-secondary"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {switchingBranch === branch.name ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Globe className="w-3 h-3" />
                  )}
                </span>
                <span className="truncate flex-1 font-mono">{branch.name}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-xs text-accent-red px-2 py-1">{error}</p>
        )}
      </div>
    </CollapsibleSection>
  );
}

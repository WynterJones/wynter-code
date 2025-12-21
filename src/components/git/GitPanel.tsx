import { useState, useEffect, useCallback } from "react";
import { GitBranch, GitCommit as GitCommitIcon, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui";
import { gitService, type GitStatus, type GitCommit, type GitBranch as GitBranchType } from "@/services/git";
import { CollapsibleSection } from "./CollapsibleSection";
import { ChangesSection } from "./ChangesSection";
import { CommitSection } from "./CommitSection";
import { SyncSection } from "./SyncSection";
import { BranchSection } from "./BranchSection";

interface GitPanelProps {
  projectPath: string;
}

export function GitPanel({ projectPath }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [remoteStatus, setRemoteStatus] = useState<{ ahead: number; behind: number; hasRemote: boolean }>({
    ahead: 0,
    behind: 0,
    hasRemote: false,
  });
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadGitData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    const isRepo = await gitService.isGitRepo(projectPath);
    setIsGitRepo(isRepo);

    if (isRepo) {
      const [statusData, commitsData, branchesData] = await Promise.all([
        gitService.getStatus(projectPath),
        gitService.getCommits(projectPath, 5),
        gitService.getBranches(projectPath),
      ]);

      setStatus(statusData);
      setCommits(commitsData);
      setBranches(branchesData);

      // Get remote status (includes fetch)
      const remote = await gitService.getRemoteStatus(projectPath);
      setRemoteStatus(remote);

      // Update status with remote counts if different
      if (remote.ahead !== statusData.ahead || remote.behind !== statusData.behind) {
        setStatus((prev) =>
          prev ? { ...prev, ahead: remote.ahead, behind: remote.behind } : prev
        );
      }
    }

    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    loadGitData();
  }, [loadGitData]);

  const handleRefresh = useCallback(() => {
    loadGitData(true);
  }, [loadGitData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!isGitRepo) {
    return (
      <div className="p-4 text-center">
        <GitBranch className="w-8 h-8 text-text-secondary mx-auto mb-2" />
        <p className="text-sm text-text-secondary">Not a git repository</p>
      </div>
    );
  }

  const totalChanges =
    (status?.staged.length || 0) +
    (status?.modified.length || 0) +
    (status?.untracked.length || 0);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        {/* Sync Section (Branch + Push/Pull) */}
        <SyncSection
          projectPath={projectPath}
          branch={status?.branch || "main"}
          ahead={remoteStatus.ahead}
          behind={remoteStatus.behind}
          hasRemote={remoteStatus.hasRemote}
          onRefresh={handleRefresh}
        />

        {/* Commit Section - Always first and expanded */}
        <CommitSection
          projectPath={projectPath}
          stagedCount={status?.staged.length || 0}
          onRefresh={handleRefresh}
        />

        {/* Changes Section */}
        {totalChanges > 0 && (
          <ChangesSection
            projectPath={projectPath}
            staged={status?.staged || []}
            modified={status?.modified || []}
            untracked={status?.untracked || []}
            onRefresh={handleRefresh}
          />
        )}

        {/* Branches Section */}
        <BranchSection
          projectPath={projectPath}
          currentBranch={status?.branch || "main"}
          branches={branches}
          onRefresh={handleRefresh}
        />

        {/* Recent Commits */}
        <CollapsibleSection
          title="Recent Commits"
          icon={GitCommitIcon}
          iconColor="text-accent-purple"
          count={commits.length}
          defaultOpen={false}
        >
          <div className="space-y-1 px-2">
            {commits.length === 0 ? (
              <p className="text-xs text-text-secondary py-2">No commits yet</p>
            ) : (
              commits.map((commit) => (
                <div
                  key={commit.hash}
                  className="text-xs p-2 rounded bg-bg-tertiary hover:bg-bg-hover transition-colors cursor-default"
                  title={`${commit.hash}\n${commit.author}\n${commit.date}`}
                >
                  <p className="text-text-primary truncate mb-0.5 font-medium">
                    {commit.message}
                  </p>
                  <p className="text-text-secondary text-[10px]">
                    <span className="font-mono text-accent-cyan">
                      {commit.hash.slice(0, 7)}
                    </span>
                    {" • "}
                    {commit.author}
                    {" • "}
                    {commit.date}
                  </p>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}

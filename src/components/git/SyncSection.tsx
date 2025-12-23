import { useState } from "react";
import { GitBranch, ArrowUp, ArrowDown, RefreshCw, Loader2, Cloud, CloudOff } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { gitService } from "@/services";
import { cn } from "@/lib/utils";

interface SyncSectionProps {
  projectPath: string;
  branch: string;
  ahead: number;
  behind: number;
  hasRemote: boolean;
  onRefresh: () => void;
}

export function SyncSection({
  projectPath,
  branch,
  ahead,
  behind,
  hasRemote,
  onRefresh,
}: SyncSectionProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setIsFetching(true);
    setError(null);
    await gitService.fetch(projectPath);
    setIsFetching(false);
    onRefresh();
  };

  const handlePush = async () => {
    setIsPushing(true);
    setError(null);

    const result = await gitService.push(projectPath, { setUpstream: !hasRemote });

    if (!result.success) {
      setError(result.error || "Push failed");
    }

    setIsPushing(false);
    onRefresh();
  };

  const handlePull = async () => {
    setIsPulling(true);
    setError(null);

    const result = await gitService.pull(projectPath);

    if (!result.success) {
      setError(result.error || "Pull failed");
    }

    setIsPulling(false);
    onRefresh();
  };

  return (
    <div className="px-2">
      <div className="rounded-lg border border-border bg-bg-secondary p-3 space-y-3">
        {/* Branch Header with Sync Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <GitBranch className="w-4 h-4 text-accent-cyan shrink-0" />
            <span className="text-sm font-mono text-text-primary truncate">
              {branch}
            </span>
            {hasRemote ? (
              <span title="Has remote">
                <Cloud className="w-3 h-3 text-accent-green shrink-0" />
              </span>
            ) : (
              <span title="No remote tracking">
                <CloudOff className="w-3 h-3 text-text-secondary shrink-0" />
              </span>
            )}
          </div>

          {/* Ahead/Behind Badges */}
          <div className="flex items-center gap-1 shrink-0">
            {ahead > 0 && (
              <Badge variant="info" className="gap-0.5">
                <ArrowUp className="w-2.5 h-2.5" />
                {ahead}
              </Badge>
            )}
            {behind > 0 && (
              <Badge variant="warning" className="gap-0.5">
                <ArrowDown className="w-2.5 h-2.5" />
                {behind}
              </Badge>
            )}
          </div>
        </div>

        {/* Push/Pull Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFetch}
            disabled={isFetching}
            className="gap-1"
            title="Fetch from remote"
          >
            {isFetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePull}
            disabled={isPulling || behind === 0}
            className={cn(
              "flex-1 gap-1.5",
              behind > 0 && "border-accent-yellow/50"
            )}
          >
            {isPulling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">
              Pull{behind > 0 ? ` (${behind})` : ""}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePush}
            disabled={isPushing || (ahead === 0 && hasRemote)}
            className={cn(
              "flex-1 gap-1.5",
              ahead > 0 && "border-accent-blue/50"
            )}
          >
            {isPushing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">
              {!hasRemote ? "Publish" : `Push${ahead > 0 ? ` (${ahead})` : ""}`}
            </span>
          </Button>
        </div>

        {error && (
          <p className="text-xs text-accent-red truncate" title={error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

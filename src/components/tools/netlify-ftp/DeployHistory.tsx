import { Clock, ExternalLink, RotateCcw, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import { ScrollArea, Badge } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";
import type { NetlifyDeploy } from "@/types/netlifyFtp";

interface DeployHistoryProps {
  deploys: NetlifyDeploy[];
  isLoading: boolean;
  onRollback: (deployId: string) => void;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function DeployHistory({
  deploys,
  isLoading,
  onRollback,
}: DeployHistoryProps) {
  const handleOpenUrl = async (url: string) => {
    try {
      await open(url);
    } catch (err) {
      console.error("Failed to open URL:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading deploys...
        </div>
      </div>
    );
  }

  if (deploys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Clock className="w-8 h-8 mb-2 text-text-secondary opacity-50" />
        <div className="text-xs text-text-primary mb-1">No deploys yet</div>
        <div className="text-xs text-text-secondary">
          Drop a ZIP file to deploy
        </div>
      </div>
    );
  }

  // Find the live deploy (first one with state 'ready' that is published)
  const liveDeployId = deploys.find((d) => d.state === "ready")?.id;

  return (
    <ScrollArea className="h-full">
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wider px-3 py-2 border-b border-border">
        Deploy History
      </div>

      {deploys.slice(0, 10).map((deploy, index) => {
        const isLive = deploy.id === liveDeployId && index === 0;

        return (
          <div
            key={deploy.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-bg-hover transition-colors group"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                deploy.state === "ready" && "bg-accent-green",
                deploy.state === "error" && "bg-accent-red",
                (deploy.state === "building" ||
                  deploy.state === "processing") &&
                  "bg-accent-yellow animate-pulse"
              )}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-primary">
                  v{deploys.length - index}
                </span>
                {deploy.title && (
                  <span className="text-xs text-text-secondary truncate">
                    {deploy.title}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-text-secondary">
                {getTimeAgo(deploy.created_at)}
              </div>
            </div>

            {isLive && <Badge variant="success">LIVE</Badge>}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconButton
                size="sm"
                onClick={() =>
                  handleOpenUrl(deploy.deploy_ssl_url || deploy.deploy_url)
                }
                title="Open deploy preview"
              >
                <ExternalLink className="w-3 h-3" />
              </IconButton>

              {!isLive && deploy.state === "ready" && (
                <IconButton
                  size="sm"
                  onClick={() => onRollback(deploy.id)}
                  title="Rollback to this version"
                >
                  <RotateCcw className="w-3 h-3" />
                </IconButton>
              )}
            </div>
          </div>
        );
      })}

      {deploys.length > 10 && (
        <div className="text-center text-xs text-text-secondary py-2">
          + {deploys.length - 10} more deploys
        </div>
      )}
    </ScrollArea>
  );
}

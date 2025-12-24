import { Clock, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetlifyDeploy } from "@/types/netlifyFtp";

interface DeployHistoryProps {
  deploys: NetlifyDeploy[];
  isLoading: boolean;
  onRollback: (deployId: string) => void;
  theme?: "classic" | "terminal" | "amber";
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
  theme = "classic",
}: DeployHistoryProps) {
  const isTerminalTheme = theme === "terminal" || theme === "amber";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn("text-xs", isTerminalTheme && "crt-glow")}>
          Loading deploys<span className="blink">...</span>
        </div>
      </div>
    );
  }

  if (deploys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Clock className={cn(
          "w-8 h-8 mb-2 opacity-50",
          isTerminalTheme && "crt-glow"
        )} />
        <div className={cn("text-xs", isTerminalTheme && "crt-glow")}>
          No deploys yet
        </div>
        <div className={cn("text-xs opacity-70", isTerminalTheme && "crt-glow")}>
          Drop a ZIP file to deploy
        </div>
      </div>
    );
  }

  // Find the live deploy (first one with state 'ready' that is published)
  const liveDeployId = deploys.find(d => d.state === 'ready')?.id;

  return (
    <div className="h-full overflow-auto">
      <div className={cn(
        "text-[9px] uppercase tracking-wider px-2 py-1 font-bold border-b",
        isTerminalTheme 
          ? "border-current opacity-70 crt-glow" 
          : "border-gray-300 text-gray-500"
      )}>
        Deploy History
      </div>
      
      {deploys.slice(0, 10).map((deploy, index) => {
        const isLive = deploy.id === liveDeployId && index === 0;
        
        return (
          <div
            key={deploy.id}
            className={cn(
              "retro-deploy-item group",
              isTerminalTheme && "crt-glow"
            )}
          >
            <div className={cn(
              "retro-deploy-status",
              deploy.state === 'ready' && "ready",
              deploy.state === 'error' && "error",
              (deploy.state === 'building' || deploy.state === 'processing') && "building"
            )} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]">
                  v{deploys.length - index}
                </span>
                {deploy.title && (
                  <span className="truncate opacity-70">
                    {deploy.title}
                  </span>
                )}
              </div>
              <div className="text-[9px] opacity-60">
                {getTimeAgo(deploy.created_at)}
              </div>
            </div>

            {isLive && (
              <span className="retro-deploy-live">LIVE</span>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <a
                href={deploy.deploy_ssl_url || deploy.deploy_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-blue-500/20 rounded"
                title="Open deploy preview"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
              
              {!isLive && deploy.state === 'ready' && (
                <button
                  className="p-1 hover:bg-yellow-500/20 rounded"
                  onClick={() => onRollback(deploy.id)}
                  title="Rollback to this version"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      
      {deploys.length > 10 && (
        <div className={cn(
          "text-center text-[9px] py-2 opacity-50",
          isTerminalTheme && "crt-glow"
        )}>
          + {deploys.length - 10} more deploys
        </div>
      )}
    </div>
  );
}

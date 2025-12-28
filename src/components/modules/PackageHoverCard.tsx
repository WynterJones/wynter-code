import { ExternalLink, ArrowUpCircle, Trash2, AlertTriangle } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface OutdatedInfo {
  current: string;
  wanted: string;
  latest: string;
}

interface NodeModule {
  name: string;
  version: string;
  description: string | null;
  is_dev: boolean;
}

interface PackageHoverCardProps {
  module: NodeModule;
  outdatedInfo?: OutdatedInfo;
  position: { top: number };
  onUpdate?: () => void;
  onUninstall?: () => void;
  isUpdating?: boolean;
  isUninstalling?: boolean;
}

export function PackageHoverCard({
  module,
  outdatedInfo,
  position,
  onUpdate,
  onUninstall,
  isUpdating,
  isUninstalling,
}: PackageHoverCardProps) {
  const isOutdated = outdatedInfo && outdatedInfo.current !== outdatedInfo.latest;

  return (
    <div
      className={cn(
        "absolute right-full mr-2 w-72 z-50",
        "bg-bg-secondary border border-border rounded-lg shadow-xl dropdown-solid",
        "animate-in fade-in-0 slide-in-from-right-2 duration-150"
      )}
      style={{ top: Math.max(8, position.top - 40) }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary text-base leading-tight break-all">
            {module.name}
          </h3>
          <Badge variant={module.is_dev ? "info" : "success"} className="flex-shrink-0">
            {module.is_dev ? "dev" : "prod"}
          </Badge>
        </div>

        {/* Description */}
        {module.description && (
          <p className="text-sm text-text-secondary leading-relaxed">
            {module.description}
          </p>
        )}

        {/* Version Info */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Installed</span>
            <span className="font-mono text-text-primary">{module.version}</span>
          </div>

          {outdatedInfo && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Current</span>
                <span className="font-mono text-text-primary">{outdatedInfo.current}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Latest</span>
                <span
                  className={cn(
                    "font-mono inline-flex items-center gap-1",
                    isOutdated ? "text-accent-yellow font-medium" : "text-accent-green"
                  )}
                >
                  {outdatedInfo.latest}
                  {isOutdated && <AlertTriangle className="w-3 h-3" />}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {isOutdated && onUpdate && (
            <Button
              size="sm"
              variant="default"
              onClick={onUpdate}
              disabled={isUpdating}
              className="flex-1"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5" />
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          )}

          <a
            href={`https://www.npmjs.com/package/${module.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm",
              "rounded-md border border-border",
              "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
              "transition-colors",
              isOutdated ? "" : "flex-1"
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            npm
          </a>

          {onUninstall && (
            <button
              onClick={onUninstall}
              disabled={isUninstalling}
              className={cn(
                "p-1.5 rounded-md",
                "text-text-secondary hover:text-accent-red hover:bg-accent-red/10",
                "transition-colors",
                isUninstalling && "opacity-50 cursor-not-allowed"
              )}
              title="Uninstall package"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

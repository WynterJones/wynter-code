import { useState, useRef, useCallback } from "react";
import { Globe, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";
import type { NetlifySite } from "@/types/netlifyFtp";

const HOLD_DURATION = 1300; // 1.3 seconds

interface HoldToDeleteButtonProps {
  onDelete: () => void;
}

function HoldToDeleteButton({ onDelete }: HoldToDeleteButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Update progress every 16ms (~60fps)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16);

    // Trigger delete after hold duration
    holdTimerRef.current = setTimeout(() => {
      cleanup();
      onDelete();
    }, HOLD_DURATION);
  }, [onDelete]);

  const cleanup = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  const cancelHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    cleanup();
  }, [cleanup]);

  return (
    <div className="relative">
      <IconButton
        size="sm"
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        title="Hold to delete"
        className={cn(
          "relative overflow-hidden",
          isHolding && "!bg-accent-red/20"
        )}
      >
        {/* Progress ring */}
        {isHolding && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent-red/30"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progress * 0.628} 100`}
              className="text-accent-red transition-none"
            />
          </svg>
        )}
        <Trash2 className={cn(
          "w-3 h-3 relative z-10 transition-colors",
          isHolding ? "text-accent-red" : "text-accent-red"
        )} />
      </IconButton>
    </div>
  );
}

interface SiteListProps {
  sites: NetlifySite[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onDeleteSite: (siteId: string) => void;
  isLoading: boolean;
}

export function SiteList({
  sites,
  selectedSiteId,
  onSelectSite,
  onDeleteSite,
  isLoading,
}: SiteListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading sites...
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Globe className="w-8 h-8 mb-2 text-text-secondary opacity-50" />
        <div className="text-xs text-text-primary mb-1">No sites found</div>
        <div className="text-xs text-text-secondary">
          Create a new site to get started
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      {sites.map((site) => {
        // Get display URL - prefer custom domain, otherwise use netlify subdomain
        const displayUrl = site.custom_domain || site.url.replace(/https?:\/\//, "");

        return (
          <div
            key={site.id}
            className={cn(
              "flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors group",
              "hover:bg-bg-hover",
              selectedSiteId === site.id && "bg-accent/10"
            )}
            onClick={() => onSelectSite(site.id)}
          >
            {/* Screenshot thumbnail */}
            {site.screenshot_url ? (
              <img
                src={site.screenshot_url}
                alt={site.name}
                className={cn(
                  "w-12 h-8 object-cover rounded border shrink-0",
                  selectedSiteId === site.id ? "border-accent" : "border-border"
                )}
              />
            ) : (
              <div className={cn(
                "w-12 h-8 rounded border shrink-0 bg-bg-tertiary flex items-center justify-center",
                selectedSiteId === site.id ? "border-accent" : "border-border"
              )}>
                <Globe className="w-3 h-3 text-text-secondary" />
              </div>
            )}

            {/* URL only */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-xs truncate",
                  selectedSiteId === site.id ? "text-accent" : "text-text-secondary"
                )}
              >
                {displayUrl}
              </div>
            </div>

            {/* Delete button - only show on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <HoldToDeleteButton onDelete={() => onDeleteSite(site.id)} />
            </div>
          </div>
        );
      })}
    </ScrollArea>
  );
}

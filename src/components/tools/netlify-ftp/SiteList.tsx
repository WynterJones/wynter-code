import { Folder, Globe, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetlifySite } from "@/types/netlifyFtp";

interface SiteListProps {
  sites: NetlifySite[];
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onDeleteSite: (siteId: string) => void;
  isLoading: boolean;
  theme?: "classic" | "terminal" | "amber";
}

export function SiteList({
  sites,
  selectedSiteId,
  onSelectSite,
  onDeleteSite,
  isLoading,
  theme = "classic",
}: SiteListProps) {
  const isTerminalTheme = theme === "terminal" || theme === "amber";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={cn("text-xs", isTerminalTheme && "crt-glow")}>
          Loading sites<span className="blink">...</span>
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className={cn(
          "w-8 h-8 mb-2 opacity-50",
          isTerminalTheme && "crt-glow"
        )} />
        <div className={cn("text-xs", isTerminalTheme && "crt-glow")}>
          No sites found
        </div>
        <div className={cn("text-xs opacity-70", isTerminalTheme && "crt-glow")}>
          Create a new site to get started
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {sites.map((site) => (
        <div
          key={site.id}
          className={cn(
            "retro-list-item group",
            selectedSiteId === site.id && "selected"
          )}
          onClick={() => onSelectSite(site.id)}
        >
          <Folder className="retro-list-item-icon" />
          <div className="flex-1 min-w-0">
            <div className={cn(
              "truncate font-bold",
              isTerminalTheme && selectedSiteId !== site.id && "crt-glow"
            )}>
              {site.name}
            </div>
            <div className={cn(
              "text-[9px] truncate opacity-70",
              isTerminalTheme && "crt-glow"
            )}>
              {site.custom_domain || site.url.replace(/https?:\/\//, '')}
            </div>
          </div>
          
          {site.custom_domain && (
            <Globe className="w-3 h-3 opacity-50" />
          )}
          
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSite(site.id);
            }}
            title="Delete site"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

import { Folder, Globe, Trash2, Loader2, ExternalLink } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";
import { IconButton } from "@/components/ui/IconButton";
import type { NetlifySite } from "@/types/netlifyFtp";

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
  const handleOpenUrl = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
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
          Loading sites...
        </div>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Folder className="w-8 h-8 mb-2 text-text-secondary opacity-50" />
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
        const siteUrl = site.custom_domain
          ? `https://${site.custom_domain}`
          : site.ssl_url || site.url;

        return (
          <div
            key={site.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group",
              "hover:bg-bg-hover",
              selectedSiteId === site.id && "bg-accent/10"
            )}
            onClick={() => onSelectSite(site.id)}
          >
            <Folder
              className={cn(
                "w-4 h-4 shrink-0",
                selectedSiteId === site.id ? "text-accent" : "text-text-secondary"
              )}
            />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm font-medium truncate",
                  selectedSiteId === site.id && "text-accent"
                )}
              >
                {site.name}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {site.custom_domain || site.url.replace(/https?:\/\//, "")}
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {site.custom_domain && (
                <IconButton
                  size="sm"
                  onClick={(e) => handleOpenUrl(e, siteUrl)}
                  title="Open site"
                >
                  <Globe className="w-3 h-3 text-accent" />
                </IconButton>
              )}
              {!site.custom_domain && (
                <IconButton
                  size="sm"
                  onClick={(e) => handleOpenUrl(e, siteUrl)}
                  title="Open site"
                >
                  <ExternalLink className="w-3 h-3" />
                </IconButton>
              )}
              <IconButton
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSite(site.id);
                }}
                title="Delete site"
              >
                <Trash2 className="w-3 h-3 text-accent-red" />
              </IconButton>
            </div>
          </div>
        );
      })}
    </ScrollArea>
  );
}

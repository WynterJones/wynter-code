import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  Globe,
  Star,
} from "lucide-react";
import { useBrowserDockStore, DockFavorite } from "@/stores/browserDockStore";
import { Input, IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";

interface BrowserState {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function getFaviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

function getPageTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function BrowserToolbar() {
  const {
    getSortedFavorites,
    addFavorite,
    getFavoriteByUrl,
    browserWindowSize,
    currentBrowserUrl,
    setCurrentBrowserUrl,
  } = useBrowserDockStore();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sortedFavorites = getSortedFavorites();
  const isCurrentUrlFavorited = currentBrowserUrl
    ? getFavoriteByUrl(currentBrowserUrl) !== undefined
    : false;

  // Poll for current browser state
  useEffect(() => {
    const fetchBrowserState = async () => {
      try {
        const state = await invoke<BrowserState | null>("get_browser_state");
        if (state?.url) {
          setCurrentBrowserUrl(state.url);
          setUrlInput(state.url);
        }
      } catch (error) {
        console.error("Failed to get browser state:", error);
      }
    };

    // Initial fetch
    fetchBrowserState();

    // Poll every 2 seconds for URL changes
    const interval = setInterval(fetchBrowserState, 2000);

    return () => clearInterval(interval);
  }, [setCurrentBrowserUrl]);

  const navigateToUrl = useCallback(
    async (url: string, favorite?: DockFavorite) => {
      if (!url.trim()) return;

      // Ensure URL has protocol
      let normalizedUrl = url.trim();
      if (
        !normalizedUrl.startsWith("http://") &&
        !normalizedUrl.startsWith("https://")
      ) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      setIsLoading(true);
      try {
        const isOpen = await invoke<boolean>("is_browser_open");
        if (isOpen) {
          await invoke("navigate_browser_content", {
            url: normalizedUrl,
            customCss: favorite?.customCSS ?? null,
            customJs: favorite?.customJS ?? null,
          });
        } else {
          await invoke("create_browser_window", {
            url: normalizedUrl,
            width: browserWindowSize.width,
            height: browserWindowSize.height,
            customCss: favorite?.customCSS ?? null,
            customJs: favorite?.customJS ?? null,
          });
        }
        setCurrentBrowserUrl(normalizedUrl);
        setUrlInput(normalizedUrl);
      } catch (error) {
        console.error("Failed to navigate:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [browserWindowSize, setCurrentBrowserUrl]
  );

  const handleUrlKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigateToUrl(urlInput);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (currentBrowserUrl) {
      const favorite = getFavoriteByUrl(currentBrowserUrl);
      await navigateToUrl(currentBrowserUrl, favorite);
    }
  }, [currentBrowserUrl, getFavoriteByUrl, navigateToUrl]);

  const handleAddFavorite = useCallback(() => {
    if (!currentBrowserUrl) return;

    addFavorite({
      url: currentBrowserUrl,
      title: getPageTitle(currentBrowserUrl),
      faviconUrl: getFaviconUrl(currentBrowserUrl),
      customCSS: null,
      customJS: null,
    });
  }, [currentBrowserUrl, addFavorite]);

  const handleFavoriteClick = useCallback(
    (favorite: DockFavorite) => {
      navigateToUrl(favorite.url, favorite);
    },
    [navigateToUrl]
  );

  return (
    <div
      className={cn(
        "h-[100px] flex items-center gap-3 px-3",
        "bg-bg-primary border-b border-border-primary"
      )}
    >
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <IconButton
          aria-label="Go back"
          size="sm"
          variant="ghost"
          disabled
        >
          <ArrowLeft className="w-4 h-4" />
        </IconButton>

        <IconButton
          aria-label="Go forward"
          size="sm"
          variant="ghost"
          disabled
        >
          <ArrowRight className="w-4 h-4" />
        </IconButton>

        <IconButton
          aria-label="Refresh page"
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={!currentBrowserUrl || isLoading}
        >
          <RotateCw
            className={cn("w-4 h-4", isLoading && "animate-spin")}
          />
        </IconButton>
      </div>

      {/* URL bar */}
      <div className="flex-1 min-w-0">
        <Input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          placeholder="Enter URL..."
          className="h-9 text-sm"
          aria-label="URL address bar"
        />
      </div>

      {/* Add to favorites button */}
      <IconButton
        aria-label="Add to favorites"
        size="sm"
        variant={isCurrentUrlFavorited ? "primary" : "ghost"}
        onClick={handleAddFavorite}
        disabled={!currentBrowserUrl || isCurrentUrlFavorited}
      >
        {isCurrentUrlFavorited ? (
          <Star className="w-4 h-4 fill-current" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </IconButton>

      {/* Favorites row */}
      {sortedFavorites.length > 0 && (
        <>
          <div className="w-px h-6 bg-border-primary" />
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {sortedFavorites.map((favorite) => (
              <FavoriteButton
                key={favorite.id}
                favorite={favorite}
                isActive={currentBrowserUrl === favorite.url}
                onClick={() => handleFavoriteClick(favorite)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface FavoriteButtonProps {
  favorite: DockFavorite;
  isActive: boolean;
  onClick: () => void;
}

function FavoriteButton({ favorite, isActive, onClick }: FavoriteButtonProps) {
  const [imageError, setImageError] = useState(false);
  const faviconUrl = favorite.faviconUrl || getFaviconUrl(favorite.url);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
        "transition-all",
        "focus:outline-none focus:ring-2 focus:ring-accent-primary/50",
        isActive
          ? "bg-accent-primary/20 ring-1 ring-accent-primary/50"
          : "hover:bg-bg-tertiary/80"
      )}
      aria-label={`Navigate to ${favorite.title}`}
    >
      {!imageError && faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 rounded"
          onError={() => setImageError(true)}
          draggable={false}
        />
      ) : (
        <Globe className="w-4 h-4 text-text-secondary" />
      )}
    </button>
  );
}

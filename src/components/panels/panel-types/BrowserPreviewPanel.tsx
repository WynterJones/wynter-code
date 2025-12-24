import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { Globe, RefreshCw, ExternalLink, ArrowLeft, ArrowRight } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";

const DEFAULT_URL = "http://localhost:3000";

export function BrowserPreviewPanel({
  panelId: _panelId,
  projectId: _projectId,
  projectPath: _projectPath,
  panel,
  isFocused: _isFocused,
  onProcessStateChange: _onProcessStateChange,
  onPanelUpdate,
}: PanelContentProps) {
  const [inputUrl, setInputUrl] = useState(panel.browserUrl || DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentUrl = panel.browserUrl || "";

  const handleNavigate = useCallback(() => {
    let url = inputUrl.trim();
    if (!url) return;

    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
    }

    setInputUrl(url);
    onPanelUpdate({ browserUrl: url, title: new URL(url).hostname });
  }, [inputUrl, onPanelUpdate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleNavigate();
      }
    },
    [handleNavigate]
  );

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true);
      iframeRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  const handleOpenExternal = useCallback(() => {
    if (currentUrl) {
      open(currentUrl);
    }
  }, [currentUrl]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // No URL set - show URL input prompt
  if (!currentUrl) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
        <Globe className="w-10 h-10 text-text-secondary/50" />
        <p className="text-sm text-text-secondary">Enter a URL to preview</p>
        <div className="flex items-center gap-2 w-full max-w-md">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="http://localhost:3000"
            className={cn(
              "flex-1 px-3 py-2 text-sm rounded-lg",
              "bg-bg-secondary border border-border",
              "text-text-primary placeholder-text-secondary/50",
              "focus:outline-none focus:ring-1 focus:ring-accent/50"
            )}
            autoFocus
          />
          <button
            onClick={handleNavigate}
            className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent/80 text-white transition-colors"
          >
            Go
          </button>
        </div>
        <p className="text-xs text-text-secondary/60">
          Tip: Start your dev server first, then enter the URL
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30 bg-bg-tertiary/50">
        {/* Navigation buttons */}
        <button
          onClick={() => iframeRef.current?.contentWindow?.history.back()}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => iframeRef.current?.contentWindow?.history.forward()}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Forward"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleRefresh}
          className={cn(
            "p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors",
            isLoading && "animate-spin"
          )}
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* URL input */}
        <div className="flex-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-text-secondary/50" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleNavigate}
            className={cn(
              "flex-1 px-2 py-0.5 text-xs rounded",
              "bg-bg-secondary/50 border border-border/50",
              "text-text-primary placeholder-text-secondary/50",
              "focus:outline-none focus:border-accent/50"
            )}
          />
        </div>

        {/* External link */}
        <button
          onClick={handleOpenExternal}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Open in browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* iframe container */}
      <div className="flex-1 overflow-hidden bg-white relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="Browser Preview"
        />
      </div>
    </div>
  );
}

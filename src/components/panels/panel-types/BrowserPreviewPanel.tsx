import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Globe, RefreshCw, ExternalLink, ArrowLeft, ArrowRight, AlertTriangle, ShieldX, ShieldAlert } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";
import type { PanelContentProps } from "@/types/panel";

const DEFAULT_URL = "http://localhost:3000";

// Known sites that block iframe embedding
const KNOWN_BLOCKED_DOMAINS = [
  "google.com",
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "github.com",
  "linkedin.com",
  "instagram.com",
  "netflix.com",
  "amazon.com",
];

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCorsError, setIsCorsError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUrl = panel.browserUrl || "";

  // Check if URL is from a known blocked domain
  const isKnownBlockedDomain = useCallback((url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return KNOWN_BLOCKED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );
    } catch {
      return false;
    }
  }, []);

  const handleNavigate = useCallback(() => {
    let url = inputUrl.trim();
    if (!url) return;

    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
    }

    setInputUrl(url);
    setLoadError(null);
    setLoadTimeout(false);
    setIsBlocked(false);
    setIsCorsError(false);
    setIsLoading(true);
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
      setLoadError(null);
      setLoadTimeout(false);
      setIsBlocked(false);
      setIsCorsError(false);
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
    setLoadTimeout(false);
    // Clear the timeout since we loaded successfully
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Try to detect if the content is blocked by X-Frame-Options, CSP, or CORS
    if (iframeRef.current && currentUrl) {
      try {
        const iframe = iframeRef.current;

        // Check if it's a known blocked domain
        if (isKnownBlockedDomain(currentUrl)) {
          setIsBlocked(true);
          return;
        }

        // Check if it's a cross-origin URL (different origin than our app)
        const isCrossOrigin = (() => {
          try {
            const currentOrigin = window.location.origin;
            const targetOrigin = new URL(currentUrl).origin;
            return currentOrigin !== targetOrigin;
          } catch {
            return true;
          }
        })();

        // For cross-origin iframes, try to detect if they're blocked
        if (isCrossOrigin) {
          try {
            // Accessing contentWindow.location on a cross-origin blocked iframe
            // will throw a SecurityError if the page loaded but is blocked,
            // or succeed with "about:blank" if the frame was blocked entirely
            const loc = iframe.contentWindow?.location?.href;

            // If we can read the location and it's about:blank on a cross-origin request,
            // it likely means the page was blocked (CORS/X-Frame-Options)
            if (loc === "about:blank") {
              setIsCorsError(true);
              return;
            }
          } catch (e) {
            // SecurityError when accessing cross-origin contentWindow is expected
            // for successfully loaded cross-origin pages - this is NORMAL and OK
            // Only flag as CORS issue if we also detect the iframe is essentially empty

            // Check if the iframe appears to have no rendered content
            // by checking its effective size/scroll dimensions
            setTimeout(() => {
              try {
                const win = iframe.contentWindow;
                // If we can't access these at all, the page might be blocked
                if (win) {
                  // Try to access something - if completely blocked, even this may fail
                  const scrollHeight = win.document?.body?.scrollHeight;
                  if (scrollHeight === 0) {
                    setIsCorsError(true);
                  }
                }
              } catch {
                // Can't access - check if it looks empty via other means
                // If loading finished but frame dimensions suggest no content
                if (iframe.scrollHeight <= 150 && iframe.clientHeight > 150) {
                  // Frame is larger than content suggests - might be blocked
                  setIsCorsError(true);
                }
              }
            }, 1000);
          }
        } else {
          // Same-origin: we can inspect the content directly
          try {
            const doc = iframe.contentDocument;
            if (doc && doc.body && doc.body.innerHTML === "") {
              setTimeout(() => {
                try {
                  const stillEmpty = iframe.contentDocument?.body?.innerHTML === "";
                  if (stillEmpty && !iframe.contentDocument?.body?.childNodes.length) {
                    setIsBlocked(true);
                  }
                } catch {
                  // Can't check anymore
                }
              }, 500);
            }
          } catch {
            // Unexpected error accessing same-origin content
          }
        }
      } catch {
        // Something went wrong, but don't block the UI
      }
    }
  }, [currentUrl, isKnownBlockedDomain]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setLoadError("Failed to load the page. The server may be unavailable or refusing connections.");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Set a timeout for loading - if it takes too long, show a hint
  useEffect(() => {
    if (isLoading && currentUrl) {
      timeoutRef.current = setTimeout(() => {
        setLoadTimeout(true);
      }, 5000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, currentUrl]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // No URL set - show URL input prompt
  if (!currentUrl) {
    return (
      <OverlayScrollbarsComponent
        className="h-full w-full"
        options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
      >
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
              className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent/80 text-primary-950 transition-colors"
            >
              Go
            </button>
          </div>
          <p className="text-xs text-text-secondary/60">
            Tip: Start your dev server first, then enter the URL
          </p>
        </div>
      </OverlayScrollbarsComponent>
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary/90 z-10 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs text-text-secondary">Loading...</span>
            {loadTimeout && (
              <div className="text-xs text-text-secondary/60 text-center max-w-[250px] mt-2">
                Taking longer than expected. Make sure your dev server is running.
              </div>
            )}
          </div>
        )}
        {loadError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary z-10 gap-3 p-4">
            <AlertTriangle className="w-8 h-8 text-yellow-500/70" />
            <span className="text-sm text-text-primary text-center">{loadError}</span>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80 text-primary-950 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleOpenExternal}
                className="px-3 py-1.5 text-xs rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-primary transition-colors"
              >
                Open in Browser
              </button>
            </div>
          </div>
        )}
        {isBlocked && !isLoading && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary z-10 gap-4 p-6">
            <ShieldX className="w-12 h-12 text-red-400/70" />
            <div className="text-center max-w-md">
              <h3 className="text-base font-medium text-text-primary mb-2">
                This site can't be displayed here
              </h3>
              <p className="text-sm text-text-secondary mb-1">
                <span className="font-mono text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
                  {(() => {
                    try {
                      return new URL(currentUrl).hostname;
                    } catch {
                      return currentUrl;
                    }
                  })()}
                </span>
              </p>
              <p className="text-xs text-text-secondary/70 mt-3">
                This website blocks embedding in iframes for security reasons
                (X-Frame-Options or Content-Security-Policy).
              </p>
            </div>
            <button
              onClick={handleOpenExternal}
              className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent/80 text-primary-950 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Browser
            </button>
          </div>
        )}
        {isCorsError && !isLoading && !loadError && !isBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary z-10 gap-4 p-6">
            <ShieldAlert className="w-12 h-12 text-orange-400/70" />
            <div className="text-center max-w-md">
              <h3 className="text-base font-medium text-text-primary mb-2">
                Cross-Origin Request Blocked
              </h3>
              <p className="text-sm text-text-secondary mb-1">
                <span className="font-mono text-xs bg-bg-tertiary px-1.5 py-0.5 rounded">
                  {(() => {
                    try {
                      return new URL(currentUrl).hostname;
                    } catch {
                      return currentUrl;
                    }
                  })()}
                </span>
              </p>
              <p className="text-xs text-text-secondary/70 mt-3">
                This page couldn't load due to CORS (Cross-Origin Resource Sharing) restrictions.
                The server doesn't allow requests from this origin.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-primary transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleOpenExternal}
                className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent/80 text-primary-950 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Browser
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
          title="Browser Preview"
        />
      </div>
    </div>
  );
}

import { useState, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { Globe, RefreshCw, ExternalLink, ArrowLeft, ArrowRight, AlertTriangle, ShieldX, ShieldAlert } from "lucide-react";
import { openExternalUrl } from "@/lib/urlSecurity";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { cn } from "@/lib/utils";

// Known sites that block iframe embedding via X-Frame-Options / CSP
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

interface IframeSessionProps {
  /** Current URL loaded in the iframe (empty until the user enters one) */
  url: string;
  /** Called when the user navigates to a new URL */
  onUrlChange: (url: string) => void;
}

export function IframeSession({ url, onUrlChange }: IframeSessionProps) {
  const [inputUrl, setInputUrl] = useState(url || "");
  const [isLoading, setIsLoading] = useState(!!url);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isCorsError, setIsCorsError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUrl = url || "";

  // Keep the input in sync when the URL changes externally (e.g. tab switch)
  useEffect(() => {
    setInputUrl(url || "");
  }, [url]);

  const isKnownBlockedDomain = useCallback((target: string) => {
    try {
      const hostname = new URL(target).hostname.toLowerCase();
      return KNOWN_BLOCKED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith("." + domain)
      );
    } catch {
      return false;
    }
  }, []);

  const handleNavigate = useCallback(() => {
    let next = inputUrl.trim();
    if (!next) return;

    if (!next.startsWith("http://") && !next.startsWith("https://")) {
      next = "https://" + next;
    }

    if (next === currentUrl) return;

    setInputUrl(next);
    setLoadError(null);
    setLoadTimeout(false);
    setIsBlocked(false);
    setIsCorsError(false);
    setIsLoading(true);
    setHasLoaded(false);
    onUrlChange(next);
  }, [inputUrl, currentUrl, onUrlChange]);

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
      setHasLoaded(false);
      iframeRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  const handleOpenExternal = useCallback(async () => {
    if (currentUrl) {
      try {
        await openExternalUrl(currentUrl);
      } catch (err) {
        console.error("Failed to open URL:", err);
      }
    }
  }, [currentUrl]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setLoadTimeout(false);
    setHasLoaded(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (iframeRef.current && currentUrl) {
      try {
        const iframe = iframeRef.current;

        if (isKnownBlockedDomain(currentUrl)) {
          setIsBlocked(true);
          return;
        }

        const isCrossOrigin = (() => {
          try {
            return window.location.origin !== new URL(currentUrl).origin;
          } catch {
            return true;
          }
        })();

        if (isCrossOrigin) {
          try {
            const loc = iframe.contentWindow?.location?.href;
            if (loc === "about:blank") {
              setIsCorsError(true);
              return;
            }
          } catch {
            setTimeout(() => {
              try {
                const win = iframe.contentWindow;
                if (win) {
                  const scrollHeight = win.document?.body?.scrollHeight;
                  if (scrollHeight === 0) {
                    setIsCorsError(true);
                  }
                }
              } catch {
                if (iframe.scrollHeight <= 150 && iframe.clientHeight > 150) {
                  setIsCorsError(true);
                }
              }
            }, 1000);
          }
        }
      } catch {
        // Don't block the UI on detection failures
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // No URL yet - prompt the user to enter one
  if (!currentUrl) {
    return (
      <OverlayScrollbarsComponent
        className="flex-1 w-full"
        options={{ scrollbars: { autoHide: "leave", autoHideDelay: 100 } }}
      >
        <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
          <Globe className="w-10 h-10 text-text-secondary/50" />
          <p className="text-sm text-text-secondary">Enter a URL to load in this tab</p>
          <div className="flex items-center gap-2 w-full max-w-md">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
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
            Some sites block embedding and will need to open in your browser.
          </p>
        </div>
      </OverlayScrollbarsComponent>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30 bg-bg-tertiary/50">
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

        <button
          onClick={handleOpenExternal}
          className="p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Open in browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* iframe container */}
      <div className="flex-1 overflow-hidden bg-bg-secondary relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary z-10 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-accent" />
            <span className="text-xs text-text-secondary">Loading...</span>
            {loadTimeout && (
              <div className="text-xs text-text-secondary/60 text-center max-w-[250px] mt-2">
                Taking longer than expected. Make sure the server is reachable.
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
                This page couldn't load due to CORS restrictions. The server
                doesn't allow requests from this origin.
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
          className={cn(
            "w-full h-full border-0",
            !hasLoaded && "opacity-0"
          )}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation"
          title="Web Tab"
        />
      </div>
    </div>
  );
}

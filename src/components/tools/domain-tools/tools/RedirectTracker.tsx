import { useState } from "react";
import { Search, ArrowRight, ExternalLink, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface RedirectHop {
  url: string;
  statusCode: number;
  statusText: string;
  location?: string;
}

export function RedirectTracker() {
  const [url, setUrl] = useState("");
  const [hops, setHops] = useState<RedirectHop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleTrack = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setHops([]);

    let fetchUrl = url.trim();
    if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
      fetchUrl = "https://" + fetchUrl;
    }

    try {
      const result = await invoke<string>("http_follow_redirects", { url: fetchUrl });

      // Parse the curl output to extract redirect chain
      const redirectChain: RedirectHop[] = [];
      const httpResponses = result.split(/(?=HTTP\/)/);

      let currentUrl = fetchUrl;

      for (const response of httpResponses) {
        if (!response.trim()) continue;

        // Extract status code from HTTP line
        const statusMatch = response.match(/^HTTP\/[\d.]+ (\d+)\s*(.*)?/);
        if (!statusMatch) continue;

        const statusCode = parseInt(statusMatch[1], 10);
        const statusText = statusMatch[2]?.trim() || "";

        // Extract Location header for redirects
        const locationMatch = response.match(/^location:\s*(.+)$/mi);
        const location = locationMatch ? locationMatch[1].trim() : undefined;

        redirectChain.push({
          url: currentUrl,
          statusCode,
          statusText,
          location,
        });

        // Update currentUrl for next hop
        if (location && statusCode >= 300 && statusCode < 400) {
          if (location.startsWith("/")) {
            const urlObj = new URL(currentUrl);
            currentUrl = urlObj.origin + location;
          } else if (!location.startsWith("http")) {
            const urlObj = new URL(currentUrl);
            currentUrl = urlObj.origin + "/" + location;
          } else {
            currentUrl = location;
          }
        }
      }

      setHops(redirectChain);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to track redirects");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500/10 text-green-400 border-green-500/20";
    if (status >= 300 && status < 400) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (status >= 400 && status < 500) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  const isRedirect = (status: number) => status >= 300 && status < 400;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
            placeholder="Enter URL to track redirects"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <Button onClick={handleTrack} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Results */}
      {hops.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Summary */}
          <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-secondary">
                Total hops: <span className="text-text-primary font-medium">{hops.length}</span>
              </span>
              <span className="text-text-secondary">
                Redirects: <span className="text-text-primary font-medium">{hops.filter(h => isRedirect(h.statusCode)).length}</span>
              </span>
              <span className="text-text-secondary">
                Final status:{" "}
                <span className={cn(
                  "font-medium",
                  hops[hops.length - 1].statusCode >= 200 && hops[hops.length - 1].statusCode < 300
                    ? "text-green-400"
                    : "text-red-400"
                )}>
                  {hops[hops.length - 1].statusCode}
                </span>
              </span>
            </div>
          </div>

          {/* Redirect Chain */}
          <div className="space-y-3">
            {hops.map((hop, index) => (
              <div key={index}>
                <div className={cn(
                  "group p-4 rounded-lg border transition-colors",
                  index === hops.length - 1
                    ? "bg-accent/5 border-accent/20"
                    : "bg-bg-secondary border-border"
                )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-text-secondary">#{index + 1}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-mono font-medium border",
                        getStatusColor(hop.statusCode)
                      )}>
                        {hop.statusCode}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-primary break-all">
                          {hop.url}
                        </span>
                        <a
                          href={hop.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {hop.location && (
                        <div className="mt-1 text-xs text-text-secondary">
                          Location: {hop.location}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(hop.url, index)}
                      className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-secondary hover:text-text-primary flex-shrink-0"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Arrow between hops */}
                {index < hops.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="w-4 h-4 text-text-secondary rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && hops.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
          <ArrowRight className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            Enter a URL to track its redirect chain<br />
            and see where it ends up
          </p>
        </div>
      )}
    </div>
  );
}

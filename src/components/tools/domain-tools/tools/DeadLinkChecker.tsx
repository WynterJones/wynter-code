import { useState, useRef } from "react";
import { Search, Loader2, Download, AlertCircle, CheckCircle, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";

interface LinkResult {
  url: string;
  anchorText: string;
  status: "pending" | "success" | "error" | "redirect" | "timeout";
  statusCode?: number;
  error?: string;
  redirectUrl?: string;
  isInternal: boolean;
}

interface DeadLinkCheckerProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function DeadLinkChecker({ url, onUrlChange }: DeadLinkCheckerProps) {
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LinkResult[]>([]);
  const checkedUrlsRef = useRef<Set<string>>(new Set());

  const normalizeUrl = (baseUrl: string, link: string): string | null => {
    try {
      if (link.startsWith("http://") || link.startsWith("https://")) {
        return new URL(link).href;
      }
      if (link.startsWith("//")) {
        return new URL(`https:${link}`).href;
      }
      if (link.startsWith("/")) {
        const base = new URL(baseUrl);
        return new URL(link, base.origin).href;
      }
      const base = new URL(baseUrl);
      return new URL(link, base.href).href;
    } catch (err) {
      return null;
    }
  };

  const isInternalLink = (baseUrl: string, linkUrl: string): boolean => {
    try {
      const base = new URL(baseUrl);
      const link = new URL(linkUrl);
      return base.hostname === link.hostname;
    } catch (err) {
      return false;
    }
  };

  const extractLinks = (html: string, baseUrl: string): Array<{ url: string; anchorText: string }> => {
    const links: Array<{ url: string; anchorText: string }> = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = doc.querySelectorAll("a[href]");

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href) return;

      const normalizedUrl = normalizeUrl(baseUrl, href);
      if (!normalizedUrl) return;

      const anchorText = anchor.textContent?.trim() || href;
      links.push({ url: normalizedUrl, anchorText });
    });

    return links;
  };

  const parseStatusCode = (headers: string): number | undefined => {
    // Parse HTTP status code from curl response headers
    const match = headers.match(/HTTP\/[\d.]+ (\d{3})/);
    return match ? parseInt(match[1], 10) : undefined;
  };

  const parseRedirectUrl = (headers: string): string | undefined => {
    const match = headers.match(/location:\s*([^\r\n]+)/i);
    return match ? match[1].trim() : undefined;
  };

  const checkLink = async (linkUrl: string, anchorText: string, baseUrl: string): Promise<LinkResult> => {
    if (checkedUrlsRef.current.has(linkUrl)) {
      return {
        url: linkUrl,
        anchorText,
        status: "pending",
        isInternal: isInternalLink(baseUrl, linkUrl),
      };
    }

    checkedUrlsRef.current.add(linkUrl);

    try {
      // Use Tauri invoke for HEAD request to bypass CORS
      const headers = await invoke<string>("http_head_request", { url: linkUrl });
      const statusCode = parseStatusCode(headers);

      if (statusCode && statusCode >= 300 && statusCode < 400) {
        const redirectUrl = parseRedirectUrl(headers);
        return {
          url: linkUrl,
          anchorText,
          status: "redirect",
          statusCode,
          redirectUrl,
          isInternal: isInternalLink(baseUrl, linkUrl),
        };
      }

      if (statusCode && statusCode >= 200 && statusCode < 300) {
        return {
          url: linkUrl,
          anchorText,
          status: "success",
          statusCode,
          isInternal: isInternalLink(baseUrl, linkUrl),
        };
      }

      return {
        url: linkUrl,
        anchorText,
        status: "error",
        statusCode,
        error: statusCode ? `HTTP ${statusCode}` : "Unknown status",
        isInternal: isInternalLink(baseUrl, linkUrl),
      };
    } catch (err) {
      return {
        url: linkUrl,
        anchorText,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        isInternal: isInternalLink(baseUrl, linkUrl),
      };
    }
  };

  const crawlPage = async (pageUrl: string, currentDepth: number, baseUrl: string): Promise<LinkResult[]> => {
    if (currentDepth > depth || checkedUrlsRef.current.has(pageUrl)) {
      return [];
    }

    checkedUrlsRef.current.add(pageUrl);

    try {
      // Use Tauri invoke to fetch HTML and bypass CORS
      const html = await invoke<string>("http_get_html", { url: pageUrl });
      const links = extractLinks(html, pageUrl);
      const results: LinkResult[] = [];

      for (const link of links) {
        const result = await checkLink(link.url, link.anchorText, baseUrl);
        results.push(result);

        if (result.status === "success" && result.isInternal && currentDepth < depth) {
          const nestedResults = await crawlPage(link.url, currentDepth + 1, baseUrl);
          results.push(...nestedResults);
        }
      }

      return results;
    } catch (err) {
      return [];
    }
  };

  const handleCheck = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    checkedUrlsRef.current = new Set();

    try {
      const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
      const baseUrl = new URL(cleanUrl).origin;

      const initialResults = await crawlPage(cleanUrl, 1, baseUrl);
      setResults(initialResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crawl URL");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;

    const headers = ["URL", "Anchor Text", "Status", "Status Code", "Error", "Type"];
    const rows = results.map((r) => [
      r.url,
      r.anchorText,
      r.status,
      r.statusCode?.toString() || "",
      r.error || "",
      r.isInternal ? "Internal" : "External",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dead-links-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const brokenLinks = results.filter((r) => r.status === "error" || r.status === "timeout");
  const redirectLinks = results.filter((r) => r.status === "redirect");
  const workingLinks = results.filter((r) => r.status === "success");

  const getStatusIcon = (status: LinkResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error":
      case "timeout":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "redirect":
        return <ExternalLink className="w-4 h-4 text-yellow-400" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-text-secondary" />;
    }
  };

  const getStatusColor = (status: LinkResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "error":
      case "timeout":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "redirect":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-bg-tertiary text-text-secondary border-border";
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Enter URL to crawl (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <select
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
          className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value={1}>Depth: 1</option>
          <option value={2}>Depth: 2</option>
          <option value={3}>Depth: 3</option>
          <option value={4}>Depth: 4</option>
          <option value={5}>Depth: 5</option>
        </select>
        <Button variant="primary" onClick={handleCheck} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Total:</span>
                <span className="text-text-primary font-medium">{results.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Broken:</span>
                <span className="text-red-400 font-medium">{brokenLinks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Redirects:</span>
                <span className="text-yellow-400 font-medium">{redirectLinks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Working:</span>
                <span className="text-green-400 font-medium">{workingLinks.length}</span>
              </div>
            </div>
            <Button onClick={handleExportCsv} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3",
                    getStatusColor(result.status)
                  )}
                >
                  <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary break-all">
                        {result.anchorText}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          result.isInternal
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-purple-500/10 text-purple-400"
                        )}
                      >
                        {result.isInternal ? "Internal" : "External"}
                      </span>
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-secondary hover:text-text-primary break-all flex items-center gap-1"
                    >
                      {result.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {result.statusCode && (
                      <div className="text-xs text-text-tertiary mt-1">
                        Status: {result.statusCode}
                      </div>
                    )}
                    {result.error && (
                      <div className="text-xs text-red-400 mt-1">{result.error}</div>
                    )}
                    {result.redirectUrl && (
                      <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Redirects to: {result.redirectUrl}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


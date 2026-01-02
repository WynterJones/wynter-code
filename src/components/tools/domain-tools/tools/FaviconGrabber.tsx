import { useState } from "react";
import { Search, Loader2, Download, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { invoke } from "@tauri-apps/api/core";
import JSZip from "jszip";

interface FaviconInfo {
  url: string;
  size: string;
  type: string;
  rel?: string;
  source: string;
}

interface FaviconGrabberProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function FaviconGrabber({ url, onUrlChange }: FaviconGrabberProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favicons, setFavicons] = useState<FaviconInfo[]>([]);

  const extractSizeFromUrl = (url: string): string => {
    const match = url.match(/(\d+)x(\d+)/i);
    if (match) {
      return `${match[1]}×${match[2]}`;
    }
    return "Unknown";
  };

  const extractFavicons = async (targetUrl: string): Promise<FaviconInfo[]> => {
    const baseUrl = new URL(targetUrl);
    const found: FaviconInfo[] = [];

    try {
      // Use Tauri invoke to bypass CORS
      const html = await invoke<string>("http_get_html", { url: targetUrl });
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const linkTags = doc.querySelectorAll("link[rel*='icon'], link[rel*='apple'], link[rel*='shortcut']");
      linkTags.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;

        const rel = link.getAttribute("rel") || "";
        const sizes = link.getAttribute("sizes") || "";
        const type = link.getAttribute("type") || "image/png";

        const absoluteUrl = new URL(href, baseUrl.origin).href;
        const size = sizes || extractSizeFromUrl(href);

        found.push({
          url: absoluteUrl,
          size,
          type,
          rel,
          source: "HTML <link> tag",
        });
      });

      // Check for manifest.json
      const manifestLink = doc.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        const manifestHref = manifestLink.getAttribute("href");
        if (manifestHref) {
          try {
            const manifestUrl = new URL(manifestHref, baseUrl.origin).href;
            const manifestJson = await invoke<string>("http_get_json", { url: manifestUrl });
            const manifest = JSON.parse(manifestJson);
            if (manifest.icons && Array.isArray(manifest.icons)) {
              manifest.icons.forEach((icon: { src: string; sizes?: string; type?: string }) => {
                const iconUrl = new URL(icon.src, baseUrl.origin).href;
                found.push({
                  url: iconUrl,
                  size: icon.sizes || "Unknown",
                  type: icon.type || "image/png",
                  source: "manifest.json",
                });
              });
            }
          } catch { // Ignore - best effort
            // Manifest not found or invalid
          }
        }
      }

      // Check common favicon paths using HEAD requests
      const commonPaths = [
        "/favicon.ico",
        "/apple-touch-icon.png",
        "/apple-touch-icon-precomposed.png",
        "/favicon-16x16.png",
        "/favicon-32x32.png",
        "/favicon-96x96.png",
        "/favicon-192x192.png",
        "/favicon-512x512.png",
        "/android-chrome-192x192.png",
        "/android-chrome-512x512.png",
      ];

      for (const path of commonPaths) {
        try {
          const testUrl = new URL(path, baseUrl.origin).href;
          const headers = await invoke<string>("http_head_request", { url: testUrl });
          // Check if response contains 200 status
          if (headers.includes("200") && !headers.includes("404")) {
            // Try to extract content-type from headers
            const contentTypeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
            const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : "image/png";
            found.push({
              url: testUrl,
              size: extractSizeFromUrl(path),
              type: contentType,
              source: "Common path",
            });
          }
        } catch { // Ignore - best effort
          // Path doesn't exist
        }
      }

      const deduplicated = Array.from(
        new Map(found.map((item) => [item.url, item])).values()
      );

      return deduplicated;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to extract favicons");
    }
  };

  const handleGrab = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setFavicons([]);

    try {
      const cleanUrl = url.startsWith("http") ? url : `https://${url}`;
      const extracted = await extractFavicons(cleanUrl);
      setFavicons(extracted);

      if (extracted.length === 0) {
        setError("No favicons found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grab favicons");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (favicon: FaviconInfo) => {
    try {
      const response = await fetch(favicon.url);
      if (!response.ok) throw new Error("Failed to download");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const filename = favicon.url.split("/").pop() || `favicon-${Date.now()}.png`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download favicon");
    }
  };

  const handleDownloadAll = async () => {
    if (favicons.length === 0) return;

    const zip = new JSZip();
    const promises = favicons.map(async (favicon, index) => {
      try {
        const response = await fetch(favicon.url);
        if (response.ok) {
          const blob = await response.blob();
          const filename = favicon.url.split("/").pop() || `favicon-${index}.png`;
          zip.file(filename, blob);
        }
      } catch { // Ignore - best effort
      }
    });

    await Promise.all(promises);
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favicons-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSizeLabel = (size: string): string => {
    if (size === "Unknown") return size;
    return size;
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGrab()}
            placeholder="Enter URL (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <Button variant="primary" onClick={handleGrab} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grab"}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {favicons.length > 0 && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              Found <span className="text-text-primary font-medium">{favicons.length}</span> favicon(s)
            </div>
            <Button onClick={handleDownloadAll} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download All (ZIP)
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favicons.map((favicon, index) => (
                <div
                  key={index}
                  className="bg-bg-secondary rounded-lg border border-border p-4 flex flex-col gap-3"
                >
                  <div className="aspect-square bg-bg-tertiary rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={favicon.url}
                      alt={`Favicon ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                    <ImageIcon className="w-8 h-8 text-text-tertiary" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Size</span>
                      <span className="text-xs font-mono text-text-primary">{getSizeLabel(favicon.size)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Type</span>
                      <span className="text-xs text-text-primary">{favicon.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Source</span>
                      <span className="text-xs text-text-primary">{favicon.source}</span>
                    </div>
                    {favicon.rel && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">Rel</span>
                        <span className="text-xs text-text-primary">{favicon.rel}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(favicon)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <a
                      href={favicon.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover rounded text-xs text-text-primary flex items-center justify-center transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <a
                    href={favicon.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-secondary hover:text-text-primary break-all flex items-center gap-1"
                  >
                    {favicon.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


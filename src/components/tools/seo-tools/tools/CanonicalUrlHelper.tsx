import { useState } from "react";
import { Copy, Check, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function CanonicalUrlHelper() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const normalizeUrl = (inputUrl: string): string => {
    if (!inputUrl) return "";

    let normalized = inputUrl.trim();

    // Add protocol if missing
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }

    try {
      const urlObj = new URL(normalized);

      // Convert to lowercase
      urlObj.hostname = urlObj.hostname.toLowerCase();

      // Remove default ports
      if ((urlObj.protocol === "https:" && urlObj.port === "443") ||
          (urlObj.protocol === "http:" && urlObj.port === "80")) {
        urlObj.port = "";
      }

      // Remove trailing slash (except for root)
      let pathname = urlObj.pathname;
      if (pathname.length > 1 && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }
      urlObj.pathname = pathname;

      // Remove common tracking parameters
      const paramsToRemove = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref", "source"];
      paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

      // Sort remaining parameters
      const sortedParams = new URLSearchParams([...urlObj.searchParams.entries()].sort());
      urlObj.search = sortedParams.toString() ? "?" + sortedParams.toString() : "";

      return urlObj.toString();
    } catch {
      return normalized;
    }
  };

  const generateCode = () => {
    const canonicalUrl = normalizeUrl(url);
    return canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}" />` : "";
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canonicalUrl = normalizeUrl(url);
  const isModified = url && canonicalUrl !== url;

  const issues: string[] = [];
  if (url) {
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      issues.push("Missing protocol (https:// added)");
    }
    if (url !== url.toLowerCase() && url.includes("://")) {
      issues.push("Hostname contains uppercase letters");
    }
    if (url.length > 1 && url.endsWith("/") && !url.endsWith("://")) {
      issues.push("Trailing slash removed (except for root)");
    }
    const trackingParams = ["utm_", "fbclid", "gclid", "ref=", "source="];
    if (trackingParams.some((param) => url.includes(param))) {
      issues.push("Tracking parameters removed");
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Input Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <h3 className="font-medium text-text-primary">Canonical URL Helper</h3>

          <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
            <p className="text-xs text-text-secondary">
              Canonical URLs help prevent duplicate content issues by specifying the preferred version of a page.
              This tool normalizes URLs according to SEO best practices.
            </p>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Page URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page?utm_source=twitter"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Normalized URL */}
          {canonicalUrl && (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Normalized Canonical URL</label>
              <div className="p-3 bg-bg-secondary rounded-lg border border-border">
                <code className="text-sm text-accent break-all">{canonicalUrl}</code>
              </div>
            </div>
          )}

          {/* Issues/Modifications */}
          {issues.length > 0 && (
            <div className={cn(
              "p-3 rounded-lg border",
              isModified ? "bg-yellow-500/5 border-yellow-500/20" : "bg-green-500/5 border-green-500/20"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {isModified ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-medium text-text-primary">
                  {isModified ? "URL Normalized" : "URL Already Canonical"}
                </span>
              </div>
              <ul className="text-xs text-text-secondary space-y-1">
                {issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Best Practices */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Canonical URL Best Practices</h4>
            <ul className="text-xs text-text-secondary space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>Use absolute URLs with https://</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>Use lowercase for hostnames</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>Remove tracking parameters (UTM, fbclid, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>Be consistent with trailing slashes</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />
                <span>Self-reference on each page</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated Code</h3>
            <Button size="sm" onClick={handleCopy} disabled={!canonicalUrl}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
            {generateCode() || '<!-- Enter a URL to generate canonical tag -->'}
          </pre>

          {/* Implementation */}
          <div className="p-3 bg-bg-secondary rounded-lg border border-border">
            <h4 className="text-sm font-medium text-text-primary mb-2">Where to Add</h4>
            <p className="text-xs text-text-secondary">
              Place the canonical tag in the <code className="bg-bg-tertiary px-1 rounded">&lt;head&gt;</code> section
              of your HTML, preferably near the top. Every page should have a canonical tag, even if it points to itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

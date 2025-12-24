import { useState } from "react";
import { Search, Copy, Check, Loader2, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface HeaderInfo {
  name: string;
  value: string;
  category: "security" | "caching" | "content" | "cors" | "other";
}

interface SecurityCheck {
  name: string;
  passed: boolean;
  message: string;
}

export function HttpHeadersInspector() {
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<HeaderInfo[]>([]);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

  const categorizeHeader = (name: string): HeaderInfo["category"] => {
    const lowerName = name.toLowerCase();

    const securityHeaders = [
      "strict-transport-security", "content-security-policy", "x-frame-options",
      "x-content-type-options", "x-xss-protection", "referrer-policy",
      "permissions-policy", "feature-policy", "cross-origin-opener-policy",
      "cross-origin-embedder-policy", "cross-origin-resource-policy"
    ];

    const cachingHeaders = ["cache-control", "expires", "etag", "last-modified", "age", "vary"];
    const contentHeaders = ["content-type", "content-length", "content-encoding", "content-language", "content-disposition"];
    const corsHeaders = ["access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers", "access-control-expose-headers"];

    if (securityHeaders.some(h => lowerName.includes(h))) return "security";
    if (cachingHeaders.includes(lowerName)) return "caching";
    if (contentHeaders.includes(lowerName)) return "content";
    if (corsHeaders.some(h => lowerName.includes(h))) return "cors";
    return "other";
  };

  const runSecurityChecks = (headerMap: Map<string, string>): SecurityCheck[] => {
    const checks: SecurityCheck[] = [];

    const hasHsts = headerMap.has("strict-transport-security");
    checks.push({
      name: "HSTS",
      passed: hasHsts,
      message: hasHsts ? "Strict-Transport-Security header is set" : "Missing HSTS header - enables HTTPS enforcement",
    });

    const hasXfo = headerMap.has("x-frame-options");
    const hasCspFrame = headerMap.get("content-security-policy")?.includes("frame-ancestors");
    checks.push({
      name: "Clickjacking Protection",
      passed: hasXfo || !!hasCspFrame,
      message: hasXfo || hasCspFrame ? "Protected against clickjacking" : "Missing X-Frame-Options or CSP frame-ancestors",
    });

    const hasXcto = headerMap.get("x-content-type-options") === "nosniff";
    checks.push({
      name: "Content Type Options",
      passed: hasXcto,
      message: hasXcto ? "Content type sniffing is disabled" : "Missing X-Content-Type-Options: nosniff",
    });

    const hasCsp = headerMap.has("content-security-policy");
    checks.push({
      name: "Content Security Policy",
      passed: hasCsp,
      message: hasCsp ? "CSP header is configured" : "Missing Content-Security-Policy header",
    });

    const hasReferrer = headerMap.has("referrer-policy");
    checks.push({
      name: "Referrer Policy",
      passed: hasReferrer,
      message: hasReferrer ? "Referrer policy is set" : "Missing Referrer-Policy header",
    });

    return checks;
  };

  const handleInspect = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setHeaders([]);
    setSecurityChecks([]);
    setResponseStatus(null);

    try {
      let fetchUrl = url.trim();
      if (!fetchUrl.startsWith("http://") && !fetchUrl.startsWith("https://")) {
        fetchUrl = "https://" + fetchUrl;
      }

      const result = await invoke<string>("http_head_request", { url: fetchUrl });

      // Parse curl -I output
      const headerMap = new Map<string, string>();
      const parsedHeaders: HeaderInfo[] = [];
      const lines = result.split("\n");

      for (const line of lines) {
        // Check for HTTP status line
        const statusMatch = line.match(/^HTTP\/[\d.]+ (\d+)/);
        if (statusMatch) {
          setResponseStatus(parseInt(statusMatch[1], 10));
          continue;
        }

        // Parse header lines
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
          const name = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          if (name && value) {
            headerMap.set(name.toLowerCase(), value);
            parsedHeaders.push({
              name,
              value,
              category: categorizeHeader(name),
            });
          }
        }
      }

      // Sort by category
      parsedHeaders.sort((a, b) => {
        const order = { security: 0, caching: 1, content: 2, cors: 3, other: 4 };
        return order[a.category] - order[b.category];
      });

      setHeaders(parsedHeaders);
      setSecurityChecks(runSecurityChecks(headerMap));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch headers");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCategoryColor = (category: HeaderInfo["category"]) => {
    const colors = {
      security: "bg-green-500/10 text-green-400 border-green-500/20",
      caching: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      content: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      cors: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      other: "bg-bg-tertiary text-text-secondary border-border",
    };
    return colors[category];
  };

  const passedCount = securityChecks.filter(c => c.passed).length;
  const totalChecks = securityChecks.length;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInspect()}
            placeholder="Enter URL (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <Button onClick={handleInspect} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Inspect"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {headers.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto space-y-4">
          {/* Response Status */}
          {responseStatus && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-secondary">Response Status:</span>
              <span className={cn(
                "px-2 py-0.5 rounded font-mono",
                responseStatus < 300 ? "bg-green-500/10 text-green-400" :
                responseStatus < 400 ? "bg-blue-500/10 text-blue-400" :
                responseStatus < 500 ? "bg-yellow-500/10 text-yellow-400" :
                "bg-red-500/10 text-red-400"
              )}>
                {responseStatus}
              </span>
            </div>
          )}

          {/* Security Summary */}
          <div className={cn(
            "p-4 rounded-lg border",
            passedCount === totalChecks
              ? "bg-green-500/5 border-green-500/20"
              : passedCount > totalChecks / 2
              ? "bg-yellow-500/5 border-yellow-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-center gap-3 mb-3">
              {passedCount === totalChecks ? (
                <ShieldCheck className="w-6 h-6 text-green-400" />
              ) : passedCount > totalChecks / 2 ? (
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-red-400" />
              )}
              <div>
                <h3 className="font-medium text-text-primary">Security Headers</h3>
                <p className="text-sm text-text-secondary">{passedCount}/{totalChecks} checks passed</p>
              </div>
            </div>
            <div className="space-y-2">
              {securityChecks.map((check, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {check.passed ? (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={check.passed ? "text-text-primary" : "text-yellow-400"}>
                      {check.name}:
                    </span>
                    <span className="ml-1 text-text-secondary">{check.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Headers List */}
          <div className="bg-bg-secondary rounded-lg border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium text-text-primary">Response Headers ({headers.length})</h3>
            </div>
            <div className="divide-y divide-border">
              {headers.map((header, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-3 p-3 hover:bg-bg-hover/50 transition-colors"
                >
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium uppercase border flex-shrink-0",
                    getCategoryColor(header.category)
                  )}>
                    {header.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-accent">{header.name}</div>
                    <div className="font-mono text-xs text-text-secondary break-all mt-0.5">
                      {header.value}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`${header.name}: ${header.value}`, index)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-secondary hover:text-text-primary flex-shrink-0"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

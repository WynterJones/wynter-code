import { useState } from "react";
import { Search, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface WhoisData {
  raw: string;
  parsed?: {
    domainName?: string;
    registrar?: string;
    registrarUrl?: string;
    creationDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    status?: string[];
    nameServers?: string[];
  };
}

export function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<WhoisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLookup = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
      const raw = await invoke<string>("whois_lookup", { domain: cleanDomain });

      // Parse common WHOIS fields
      const parsed: WhoisData["parsed"] = {};

      const patterns: Record<string, RegExp> = {
        domainName: /Domain Name:\s*(.+)/i,
        registrar: /Registrar:\s*(.+)/i,
        registrarUrl: /Registrar URL:\s*(.+)/i,
        creationDate: /Creation Date:\s*(.+)/i,
        expirationDate: /(?:Registry Expiry Date|Expiration Date):\s*(.+)/i,
        updatedDate: /Updated Date:\s*(.+)/i,
      };

      for (const [key, regex] of Object.entries(patterns)) {
        const match = raw.match(regex);
        if (match) {
          (parsed as Record<string, string>)[key] = match[1].trim();
        }
      }

      // Parse status lines
      const statusMatches = raw.match(/Domain Status:\s*(.+)/gi);
      if (statusMatches) {
        parsed.status = statusMatches.map(s => s.replace(/Domain Status:\s*/i, "").trim());
      }

      // Parse name servers
      const nsMatches = raw.match(/Name Server:\s*(.+)/gi);
      if (nsMatches) {
        parsed.nameServers = nsMatches.map(s => s.replace(/Name Server:\s*/i, "").trim().toLowerCase());
      }

      setResult({ raw, parsed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to perform WHOIS lookup");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.raw) {
      await navigator.clipboard.writeText(result.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Enter domain (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <Button onClick={handleLookup} disabled={loading || !domain.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Parsed Summary */}
          {result.parsed && Object.keys(result.parsed).length > 0 && (
            <div className="bg-bg-secondary rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {result.parsed.domainName && (
                  <div>
                    <span className="text-text-secondary">Domain:</span>
                    <span className="ml-2 text-text-primary font-mono">{result.parsed.domainName}</span>
                  </div>
                )}
                {result.parsed.registrar && (
                  <div>
                    <span className="text-text-secondary">Registrar:</span>
                    <span className="ml-2 text-text-primary">{result.parsed.registrar}</span>
                    {result.parsed.registrarUrl && (
                      <a
                        href={result.parsed.registrarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
                {result.parsed.creationDate && (
                  <div>
                    <span className="text-text-secondary">Created:</span>
                    <span className="ml-2 text-text-primary">{formatDate(result.parsed.creationDate)}</span>
                  </div>
                )}
                {result.parsed.expirationDate && (
                  <div>
                    <span className="text-text-secondary">Expires:</span>
                    <span className="ml-2 text-text-primary">{formatDate(result.parsed.expirationDate)}</span>
                  </div>
                )}
              </div>
              {result.parsed.nameServers && result.parsed.nameServers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-text-secondary text-sm">Name Servers:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.parsed.nameServers.map((ns, i) => (
                      <span key={i} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs font-mono text-text-primary">
                        {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.parsed.status && result.parsed.status.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-text-secondary text-sm">Status:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.parsed.status.map((status, i) => (
                      <span
                        key={i}
                        className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          status.toLowerCase().includes("ok")
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        )}
                      >
                        {status.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw WHOIS Output */}
          <div className="flex-1 min-h-0 flex flex-col bg-bg-secondary rounded-lg border border-border">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h3 className="text-sm font-medium text-text-primary">Raw WHOIS Output</h3>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <pre className="flex-1 p-4 text-xs font-mono text-text-secondary overflow-auto whitespace-pre-wrap">
              {result.raw}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Search, Globe, Check, X, Loader2, MapPin } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DnsServer {
  name: string;
  location: string;
  ip: string;
}

interface PropagationResult {
  server: DnsServer;
  result: string | null;
  status: "pending" | "success" | "error";
  error?: string;
}

const DNS_SERVERS: DnsServer[] = [
  { name: "Google", location: "United States", ip: "8.8.8.8" },
  { name: "Cloudflare", location: "Global", ip: "1.1.1.1" },
  { name: "OpenDNS", location: "United States", ip: "208.67.222.222" },
  { name: "Quad9", location: "Global", ip: "9.9.9.9" },
  { name: "Level3", location: "United States", ip: "4.2.2.1" },
  { name: "Comodo", location: "United States", ip: "8.26.56.26" },
  { name: "Verisign", location: "United States", ip: "64.6.64.6" },
  { name: "DNS.Watch", location: "Germany", ip: "84.200.69.80" },
];

interface DnsPropagationProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function DnsPropagation({ url, onUrlChange }: DnsPropagationProps) {
  const [recordType, setRecordType] = useState("A");
  const [results, setResults] = useState<PropagationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    const cleanDomain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

    // Initialize results
    const initialResults: PropagationResult[] = DNS_SERVERS.map(server => ({
      server,
      result: null,
      status: "pending",
    }));
    setResults(initialResults);

    // Query each DNS server
    const checkPromises = DNS_SERVERS.map(async (server, index) => {
      try {
        const result = await invoke<string>("dns_lookup_server", {
          domain: cleanDomain,
          recordType,
          dnsServer: server.ip,
        });

        // Parse the result to get the actual record value
        const parsed = parseResult(result, recordType);

        setResults(prev => prev.map((r, i) =>
          i === index ? { ...r, result: parsed, status: "success" } : r
        ));
      } catch (e) {
        setResults(prev => prev.map((r, i) =>
          i === index ? {
            ...r,
            status: "error",
            error: e instanceof Error ? e.message : "Query failed"
          } : r
        ));
      }
    });

    await Promise.all(checkPromises);
    setLoading(false);
  };

  const parseResult = (output: string, type: string): string | null => {
    const lines = output.split("\n");
    const records: string[] = [];

    for (const line of lines) {
      if (line.startsWith(";") || !line.trim()) continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[3] === type) {
        if (type === "MX") {
          records.push(`${parts[4]} ${parts[5] || ""}`);
        } else {
          records.push(parts[4]);
        }
      }
    }

    return records.length > 0 ? records.join(", ") : null;
  };

  const successCount = results.filter(r => r.status === "success" && r.result).length;
  const checkedCount = results.filter(r => r.status !== "pending").length;

  // Check if all successful results match
  const uniqueResults = new Set(
    results.filter(r => r.status === "success" && r.result).map(r => r.result)
  );
  const isFullyPropagated = uniqueResults.size === 1 && successCount === results.length;

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Input Section */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Enter domain (e.g., example.com)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="A">A</option>
          <option value="AAAA">AAAA</option>
          <option value="MX">MX</option>
          <option value="TXT">TXT</option>
          <option value="NS">NS</option>
          <option value="CNAME">CNAME</option>
        </select>
        <Button variant="primary" onClick={handleCheck} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Propagation Status */}
      {results.length > 0 && checkedCount > 0 && (
        <div className={cn(
          "p-4 rounded-lg border",
          isFullyPropagated
            ? "bg-green-500/5 border-green-500/20"
            : uniqueResults.size > 1
            ? "bg-yellow-500/5 border-yellow-500/20"
            : "bg-bg-secondary border-border"
        )}>
          <div className="flex items-center gap-3">
            {isFullyPropagated ? (
              <Check className="w-6 h-6 text-green-400" />
            ) : (
              <Globe className="w-6 h-6 text-accent" />
            )}
            <div>
              <h3 className="font-medium text-text-primary">
                {isFullyPropagated
                  ? "Fully Propagated"
                  : `Propagation in Progress`
                }
              </h3>
              <p className="text-sm text-text-secondary">
                {successCount}/{results.length} servers responding
                {uniqueResults.size > 1 && ` • ${uniqueResults.size} different values found`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="grid gap-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  result.status === "pending"
                    ? "bg-bg-secondary border-border animate-pulse"
                    : result.status === "success" && result.result
                    ? "bg-bg-secondary border-border"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
                      {result.status === "pending" ? (
                        <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
                      ) : result.status === "success" && result.result ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{result.server.name}</div>
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <MapPin className="w-3 h-3" />
                        {result.server.location}
                        <span className="mx-1">•</span>
                        <span className="font-mono">{result.server.ip}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.status === "success" && result.result ? (
                      <div className="font-mono text-sm text-text-primary max-w-xs truncate">
                        {result.result}
                      </div>
                    ) : result.status === "success" && !result.result ? (
                      <span className="text-sm text-text-secondary">No record found</span>
                    ) : result.error ? (
                      <span className="text-sm text-red-400">{result.error}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
          <Globe className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            Enter a domain to check DNS propagation<br />
            across {DNS_SERVERS.length} global DNS servers
          </p>
        </div>
      )}
    </div>
  );
}

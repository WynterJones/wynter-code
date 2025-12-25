import { useState } from "react";
import { Search, Copy, Check, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

const RECORD_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "PTR", "SRV"];

export function DnsLookup() {
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleLookup = async () => {
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setRecords([]);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
      const result = await invoke<string>("dns_lookup", {
        domain: cleanDomain,
        recordType
      });

      // Parse dig output
      const parsed = parseDnsOutput(result, recordType);
      setRecords(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to perform DNS lookup");
    } finally {
      setLoading(false);
    }
  };

  const parseDnsOutput = (output: string, type: string): DnsRecord[] => {
    const records: DnsRecord[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.startsWith(";") || !line.trim()) continue;

      // Parse standard DNS record format: name TTL class type value
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const [name, ttlStr, , recType, ...valueParts] = parts;

        if (recType === type || type === "ANY") {
          const record: DnsRecord = {
            type: recType,
            name: name,
            value: valueParts.join(" "),
            ttl: parseInt(ttlStr, 10) || undefined,
          };

          // Handle MX priority
          if (recType === "MX" && valueParts.length >= 2) {
            record.priority = parseInt(valueParts[0], 10);
            record.value = valueParts.slice(1).join(" ");
          }

          records.push(record);
        }
      }
    }

    return records;
  };

  const handleCopy = async (value: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      A: "bg-blue-500/10 text-blue-400",
      AAAA: "bg-purple-500/10 text-purple-400",
      MX: "bg-green-500/10 text-green-400",
      TXT: "bg-yellow-500/10 text-yellow-400",
      NS: "bg-orange-500/10 text-orange-400",
      CNAME: "bg-pink-500/10 text-pink-400",
      SOA: "bg-red-500/10 text-red-400",
      PTR: "bg-teal-500/10 text-teal-400",
      SRV: "bg-indigo-500/10 text-indigo-400",
    };
    return colors[type] || "bg-bg-tertiary text-text-secondary";
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
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Button onClick={handleLookup} disabled={loading || !domain.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
        </Button>
      </div>

      {/* Quick Type Buttons */}
      <div className="flex flex-wrap gap-2">
        {RECORD_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => {
              setRecordType(type);
              if (domain.trim()) handleLookup();
            }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              recordType === type
                ? "bg-accent text-primary-950"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {records.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="space-y-2">
            {records.map((record, index) => (
              <div
                key={index}
                className="group flex items-start gap-3 p-3 bg-bg-secondary rounded-lg border border-border hover:border-border-hover transition-colors"
              >
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getRecordTypeColor(record.type))}>
                  {record.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-text-primary break-all">
                    {record.value}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-secondary">
                    <span>Name: {record.name}</span>
                    {record.ttl && <span>TTL: {record.ttl}s</span>}
                    {record.priority !== undefined && <span>Priority: {record.priority}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(record.value, index)}
                  className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-secondary hover:text-text-primary"
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
      )}

      {/* Empty State */}
      {!loading && !error && records.length === 0 && domain && (
        <div className="flex-1 flex items-center justify-center text-text-secondary">
          No {recordType} records found
        </div>
      )}
    </div>
  );
}

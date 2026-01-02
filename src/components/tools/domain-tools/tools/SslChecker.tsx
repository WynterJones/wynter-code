import { useState } from "react";
import { Search, Shield, ShieldCheck, ShieldX, Copy, Check, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SslInfo {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  serialNumber: string;
  protocol: string;
  isValid: boolean;
  chain: Array<{
    subject: string;
    issuer: string;
    validTo: string;
  }>;
}

interface SslCheckerProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function SslChecker({ url, onUrlChange }: SslCheckerProps) {
  const [sslInfo, setSslInfo] = useState<SslInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSslInfo(null);

    try {
      const cleanDomain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(":")[0].trim();
      const result = await invoke<string>("ssl_check", { domain: cleanDomain });

      // Parse OpenSSL output
      const parsed = parseSslOutput(result);
      setSslInfo(parsed);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to check SSL certificate");
    } finally {
      setLoading(false);
    }
  };

  const parseSslOutput = (output: string): SslInfo => {
    const getMatch = (pattern: RegExp): string => {
      const match = output.match(pattern);
      return match ? match[1].trim() : "";
    };

    const validFromStr = getMatch(/Not Before\s*:\s*(.+)/i);
    const validToStr = getMatch(/Not After\s*:\s*(.+)/i);

    const validTo = new Date(validToStr);
    const now = new Date();
    const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      issuer: getMatch(/Issuer\s*:\s*(.+)/i),
      subject: getMatch(/Subject\s*:\s*(.+)/i),
      validFrom: validFromStr,
      validTo: validToStr,
      daysRemaining,
      serialNumber: getMatch(/Serial Number\s*:\s*\n?\s*(.+)/i),
      protocol: getMatch(/Protocol\s*:\s*(.+)/i) || "TLS 1.3",
      isValid: daysRemaining > 0,
      chain: [],
    };
  };

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return dateStr;
    }
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return "text-red-400";
    if (days < 30) return "text-yellow-400";
    return "text-green-400";
  };

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
        <Button variant="primary" onClick={handleCheck} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check SSL"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {sslInfo && (
        <div className="flex-1 min-h-0 overflow-auto space-y-4">
          {/* Status Card */}
          <div className={cn(
            "p-4 rounded-lg border flex items-center gap-4",
            sslInfo.isValid
              ? "bg-green-500/5 border-green-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}>
            {sslInfo.isValid ? (
              <ShieldCheck className="w-12 h-12 text-green-400" />
            ) : (
              <ShieldX className="w-12 h-12 text-red-400" />
            )}
            <div>
              <h3 className={cn("text-lg font-semibold", sslInfo.isValid ? "text-green-400" : "text-red-400")}>
                {sslInfo.isValid ? "SSL Certificate Valid" : "SSL Certificate Expired"}
              </h3>
              <p className={cn("text-sm", getExpiryColor(sslInfo.daysRemaining))}>
                {sslInfo.daysRemaining > 0
                  ? `Expires in ${sslInfo.daysRemaining} days`
                  : `Expired ${Math.abs(sslInfo.daysRemaining)} days ago`
                }
              </p>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="bg-bg-secondary rounded-lg border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Certificate Details
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <InfoRow
                label="Subject"
                value={sslInfo.subject}
                onCopy={() => handleCopy(sslInfo.subject, "subject")}
                copied={copied === "subject"}
              />
              <InfoRow
                label="Issuer"
                value={sslInfo.issuer}
                onCopy={() => handleCopy(sslInfo.issuer, "issuer")}
                copied={copied === "issuer"}
              />
              <InfoRow
                label="Valid From"
                value={formatDate(sslInfo.validFrom)}
              />
              <InfoRow
                label="Valid To"
                value={formatDate(sslInfo.validTo)}
                valueClassName={getExpiryColor(sslInfo.daysRemaining)}
              />
              <InfoRow
                label="Protocol"
                value={sslInfo.protocol}
              />
              {sslInfo.serialNumber && (
                <InfoRow
                  label="Serial Number"
                  value={sslInfo.serialNumber}
                  onCopy={() => handleCopy(sslInfo.serialNumber, "serial")}
                  copied={copied === "serial"}
                  mono
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  mono?: boolean;
  valueClassName?: string;
}

function InfoRow({ label, value, onCopy, copied, mono, valueClassName }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 group">
      <span className="text-sm text-text-secondary flex-shrink-0">{label}:</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className={cn(
          "text-sm text-right break-all",
          mono ? "font-mono text-xs" : "",
          valueClassName || "text-text-primary"
        )}>
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-secondary hover:text-text-primary flex-shrink-0"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

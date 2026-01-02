import { useState } from "react";
import { Check, X, Loader2, Globe } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface DomainCheck {
  domain: string;
  tld: string;
  available: boolean;
  checked: boolean;
  error?: string;
}

const POPULAR_TLDS = [".com", ".net", ".org", ".io", ".co", ".dev", ".app", ".ai", ".xyz", ".tech"];

interface DomainAvailabilityProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function DomainAvailability({ url, onUrlChange }: DomainAvailabilityProps) {
  const [checks, setChecks] = useState<DomainCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [customTld, setCustomTld] = useState("");

  const checkDomain = async (domain: string): Promise<boolean> => {
    try {
      const result = await invoke<string>("whois_lookup", { domain });
      // If WHOIS returns data with registration info, domain is taken
      // If it returns "No match" or similar, domain is available
      const isAvailable = result.toLowerCase().includes("no match") ||
                         result.toLowerCase().includes("not found") ||
                         result.toLowerCase().includes("no data found") ||
                         result.toLowerCase().includes("status: free");
      return isAvailable;
    } catch (error) {
      // If lookup fails, we can't determine availability
      throw new Error("Could not check availability");
    }
  };

  const handleCheck = async () => {
    if (!url.trim()) return;

    const cleanName = url.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Initialize checks for all TLDs
    const initialChecks: DomainCheck[] = POPULAR_TLDS.map(tld => ({
      domain: cleanName + tld,
      tld,
      available: false,
      checked: false,
    }));

    // Add custom TLD if provided
    if (customTld.trim()) {
      const tld = customTld.startsWith(".") ? customTld : "." + customTld;
      initialChecks.unshift({
        domain: cleanName + tld,
        tld,
        available: false,
        checked: false,
      });
    }

    setChecks(initialChecks);
    setLoading(true);

    // Check domains in parallel (but with some rate limiting)
    const checkPromises = initialChecks.map(async (check, index) => {
      // Stagger requests slightly to avoid overwhelming WHOIS servers
      await new Promise(resolve => setTimeout(resolve, index * 300));

      try {
        const available = await checkDomain(check.domain);
        setChecks(prev => prev.map((c, i) =>
          i === index ? { ...c, available, checked: true } : c
        ));
      } catch (error) {
        setChecks(prev => prev.map((c, i) =>
          i === index ? { ...c, checked: true, error: "Check failed" } : c
        ));
      }
    });

    await Promise.all(checkPromises);
    setLoading(false);
  };

  const availableCount = checks.filter(c => c.checked && c.available).length;
  const checkedCount = checks.filter(c => c.checked).length;

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
            placeholder="Enter domain name (without TLD)"
            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        </div>
        <input
          type="text"
          value={customTld}
          onChange={(e) => setCustomTld(e.target.value)}
          placeholder=".custom"
          className="w-24 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
        />
        <Button variant="primary" onClick={handleCheck} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
        </Button>
      </div>

      {/* TLD Selection */}
      <div className="flex flex-wrap gap-2">
        {POPULAR_TLDS.map((tld) => (
          <span
            key={tld}
            className="px-3 py-1 rounded-full text-xs font-medium bg-bg-secondary text-text-secondary"
          >
            {tld}
          </span>
        ))}
      </div>

      {/* Results Summary */}
      {checks.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-secondary">
            Checked: {checkedCount}/{checks.length}
          </span>
          {checkedCount > 0 && (
            <span className={cn(
              "font-medium",
              availableCount > 0 ? "text-green-400" : "text-red-400"
            )}>
              {availableCount} available
            </span>
          )}
        </div>
      )}

      {/* Results Grid */}
      {checks.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {checks.map((check, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  !check.checked
                    ? "bg-bg-secondary border-border animate-pulse"
                    : check.error
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : check.available
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-text-primary">{check.tld}</span>
                  {check.checked && !check.error && (
                    check.available ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <X className="w-5 h-5 text-red-400" />
                    )
                  )}
                  {check.checked && check.error && (
                    <span className="text-yellow-400 text-xs">?</span>
                  )}
                  {!check.checked && (
                    <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
                  )}
                </div>
                <div className="font-mono text-xs text-text-secondary truncate">
                  {check.domain}
                </div>
                {check.checked && !check.error && (
                  <div className={cn(
                    "mt-2 text-xs font-medium",
                    check.available ? "text-green-400" : "text-red-400"
                  )}>
                    {check.available ? "Available" : "Taken"}
                  </div>
                )}
                {check.error && (
                  <div className="mt-2 text-xs text-yellow-400">
                    {check.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {checks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
          <Globe className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-center">
            Enter a domain name to check availability<br />
            across popular TLDs
          </p>
        </div>
      )}
    </div>
  );
}

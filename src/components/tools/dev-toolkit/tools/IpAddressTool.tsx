import { useState, useMemo } from "react";
import { Copy, Check, Trash2, CheckCircle2, XCircle, Globe } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface IpInfo {
  isValid: boolean;
  version: 4 | 6 | null;
  binary: string;
  decimal: string;
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  class: string | null;
  cidr: string | null;
}

function parseIPv4(ip: string): { parts: number[]; valid: boolean } {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  const valid =
    parts.length === 4 &&
    parts.every((p) => !isNaN(p) && p >= 0 && p <= 255) &&
    !ip.split(".").some((p) => p !== p.replace(/^0+/, "") && p !== "0");
  return { parts, valid };
}

function parseIPv6(ip: string): { parts: number[]; valid: boolean } {
  let expanded = ip;

  if (ip.includes("::")) {
    const [left, right] = ip.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    const middle = Array(missing).fill("0");
    expanded = [...leftParts, ...middle, ...rightParts].join(":");
  }

  const parts = expanded.split(":").map((p) => parseInt(p || "0", 16));
  const valid =
    parts.length === 8 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 0xffff);

  return { parts, valid };
}

function analyzeIp(ip: string): IpInfo {
  const trimmed = ip.trim();

  const ipv4 = parseIPv4(trimmed);
  if (ipv4.valid) {
    const [a, b, c, d] = ipv4.parts;
    const binary = ipv4.parts.map((p) => p.toString(2).padStart(8, "0")).join(".");
    const decimal = ((a << 24) + (b << 16) + (c << 8) + d).toString();

    let ipClass: string | null = null;
    if (a < 128) ipClass = "A";
    else if (a < 192) ipClass = "B";
    else if (a < 224) ipClass = "C";
    else if (a < 240) ipClass = "D (Multicast)";
    else ipClass = "E (Reserved)";

    const isPrivate =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);

    const isLoopback = a === 127;
    const isLinkLocal = a === 169 && b === 254;

    return {
      isValid: true,
      version: 4,
      binary,
      decimal,
      isPrivate,
      isLoopback,
      isLinkLocal,
      class: ipClass,
      cidr: null,
    };
  }

  const ipv6 = parseIPv6(trimmed);
  if (ipv6.valid) {
    const binary = ipv6.parts.map((p) => p.toString(2).padStart(16, "0")).join(":");
    const isLoopback = trimmed === "::1";
    const isLinkLocal = ipv6.parts[0] === 0xfe80;

    return {
      isValid: true,
      version: 6,
      binary,
      decimal: ipv6.parts.map((p) => p.toString()).join("."),
      isPrivate: ipv6.parts[0] >= 0xfc00 && ipv6.parts[0] <= 0xfdff,
      isLoopback,
      isLinkLocal,
      class: null,
      cidr: null,
    };
  }

  return {
    isValid: false,
    version: null,
    binary: "",
    decimal: "",
    isPrivate: false,
    isLoopback: false,
    isLinkLocal: false,
    class: null,
    cidr: null,
  };
}

interface InfoRowProps {
  label: string;
  value: string | boolean | null;
}

function InfoRow({ label, value }: InfoRowProps) {
  if (value === null || value === undefined) return null;

  const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  const colorClass =
    typeof value === "boolean"
      ? value
        ? "text-green-400"
        : "text-text-tertiary"
      : "text-text-primary";

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={cn("text-sm font-mono", colorClass)}>{displayValue}</span>
    </div>
  );
}

export function IpAddressTool() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const info = useMemo(() => analyzeIp(input), [input]);

  const handleCopy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">IP Address</label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear input">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter IPv4 or IPv6 address (e.g., 192.168.1.1 or 2001:db8::1)"
          className={cn(
            "px-3 py-2 text-sm font-mono",
            "bg-bg-primary border rounded-lg",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            input && !info.isValid ? "border-red-500/50" : "border-border"
          )}
        />
      </div>

      {input && (
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg border",
            info.isValid
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          )}
        >
          {info.isValid ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm text-green-400">
                Valid IPv{info.version} Address
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-sm text-red-400">Invalid IP Address</span>
            </>
          )}
        </div>
      )}

      {info.isValid && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">
              Basic Info
            </div>
            <InfoRow label="Version" value={`IPv${info.version}`} />
            <InfoRow label="Class" value={info.class} />
            <InfoRow label="Private" value={info.isPrivate} />
            <InfoRow label="Loopback" value={info.isLoopback} />
            <InfoRow label="Link-Local" value={info.isLinkLocal} />
          </div>

          <div className="p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">
              Representations
            </div>
            <div className="flex flex-col gap-2">
              {info.version === 4 && (
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-text-secondary">Decimal</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-text-primary">
                      {info.decimal}
                    </span>
                    <Tooltip content={copied === "dec" ? "Copied!" : "Copy"}>
                      <IconButton
                        size="sm"
                        onClick={() => handleCopy(info.decimal, "dec")}
                        className="opacity-0 group-hover:opacity-100"
                        aria-label="Copy decimal representation"
                      >
                        {copied === "dec" ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 p-3 rounded-lg bg-bg-secondary border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-tertiary uppercase tracking-wider">
                Binary
              </span>
              <Tooltip content={copied === "bin" ? "Copied!" : "Copy"}>
                <IconButton
                  size="sm"
                  onClick={() => handleCopy(info.binary, "bin")}
                  aria-label="Copy binary representation"
                >
                  {copied === "bin" ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
            <code className="font-mono text-xs text-text-primary break-all">
              {info.binary}
            </code>
          </div>
        </div>
      )}

      {!input && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-tertiary">
          <Globe className="w-8 h-8" />
          <span className="text-sm">Enter an IP address to analyze</span>
        </div>
      )}
    </div>
  );
}

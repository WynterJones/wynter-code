import { Copy, Trash2, Check, AlertCircle, ExternalLink } from "lucide-react";
import { useState, useMemo } from "react";
import { openExternalUrl, isValidExternalUrl } from "@/lib/urlSecurity";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  searchParams: Array<{ key: string; value: string }>;
}

function parseUrl(urlString: string): ParsedUrl | null {
  try {
    const url = new URL(urlString);
    const searchParams: Array<{ key: string; value: string }> = [];
    url.searchParams.forEach((value, key) => {
      searchParams.push({ key, value });
    });
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
      searchParams,
    };
  } catch {
    return null;
  }
}

interface UrlFieldProps {
  label: string;
  value: string;
  color?: string;
  onCopy: () => void;
  copied: boolean;
}

function UrlField({ label, value, color, onCopy, copied }: UrlFieldProps) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="text-xs text-text-tertiary w-24 flex-shrink-0">{label}</span>
      <span className={cn("text-sm font-mono flex-1 break-all", color || "text-text-primary")}>
        {value}
      </span>
      <Tooltip content={copied ? "Copied!" : "Copy"}>
        <IconButton size="sm" onClick={onCopy}>
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </IconButton>
      </Tooltip>
    </div>
  );
}

export function UrlParser() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    return parseUrl(input.trim());
  }, [input]);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setInput(text);
  };

  const handleOpenUrl = async () => {
    if (parsed && isValidExternalUrl(input)) {
      await openExternalUrl(input);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            URL Input
          </label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://example.com:8080/path?query=value#hash"
          className={cn(
            "min-h-[80px] resize-y font-mono text-sm",
            "bg-bg-primary border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            input && !parsed ? "border-red-500/50" : "border-border"
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handlePaste} variant="primary" size="sm">
          Paste from Clipboard
        </Button>
        {parsed && (
          <Button onClick={handleOpenUrl} variant="default" size="sm">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open URL
          </Button>
        )}
      </div>

      {parsed && (
        <div className="flex flex-col gap-4 flex-1 overflow-auto">
          <div className="bg-bg-secondary rounded-lg border border-border p-3">
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">
              URL Components
            </div>
            <UrlField
              label="Protocol"
              value={parsed.protocol}
              color="text-blue-400"
              onCopy={() => handleCopy(parsed.protocol, "protocol")}
              copied={copied === "protocol"}
            />
            <UrlField
              label="Hostname"
              value={parsed.hostname}
              color="text-green-400"
              onCopy={() => handleCopy(parsed.hostname, "hostname")}
              copied={copied === "hostname"}
            />
            <UrlField
              label="Port"
              value={parsed.port}
              color="text-yellow-400"
              onCopy={() => handleCopy(parsed.port, "port")}
              copied={copied === "port"}
            />
            <UrlField
              label="Origin"
              value={parsed.origin}
              color="text-purple-400"
              onCopy={() => handleCopy(parsed.origin, "origin")}
              copied={copied === "origin"}
            />
            <UrlField
              label="Pathname"
              value={parsed.pathname}
              color="text-orange-400"
              onCopy={() => handleCopy(parsed.pathname, "pathname")}
              copied={copied === "pathname"}
            />
            <UrlField
              label="Search"
              value={parsed.search}
              color="text-cyan-400"
              onCopy={() => handleCopy(parsed.search, "search")}
              copied={copied === "search"}
            />
            <UrlField
              label="Hash"
              value={parsed.hash}
              color="text-pink-400"
              onCopy={() => handleCopy(parsed.hash, "hash")}
              copied={copied === "hash"}
            />
          </div>

          {parsed.searchParams.length > 0 && (
            <div className="bg-bg-secondary rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary uppercase tracking-wider">
                  Query Parameters ({parsed.searchParams.length})
                </span>
                <Tooltip
                  content={
                    copied === "allParams" ? "Copied!" : "Copy as JSON"
                  }
                >
                  <IconButton
                    size="sm"
                    onClick={() => {
                      const obj = Object.fromEntries(
                        parsed.searchParams.map((p) => [p.key, p.value])
                      );
                      handleCopy(JSON.stringify(obj, null, 2), "allParams");
                    }}
                  >
                    {copied === "allParams" ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </IconButton>
                </Tooltip>
              </div>
              <div className="flex flex-col gap-1">
                {parsed.searchParams.map((param, i) => (
                  <div
                    key={`${param.key}-${i}`}
                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-bg-tertiary/30 group"
                  >
                    <span className="text-sm font-mono text-cyan-400 flex-shrink-0">
                      {param.key}
                    </span>
                    <span className="text-text-tertiary">=</span>
                    <span className="text-sm font-mono text-text-primary flex-1 break-all">
                      {decodeURIComponent(param.value)}
                    </span>
                    <Tooltip
                      content={
                        copied === `param-${i}` ? "Copied!" : "Copy value"
                      }
                    >
                      <IconButton
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          handleCopy(
                            decodeURIComponent(param.value),
                            `param-${i}`
                          )
                        }
                      >
                        {copied === `param-${i}` ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!parsed && input.trim() && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-400">
            Invalid URL. Please enter a valid URL (e.g., https://example.com)
          </span>
        </div>
      )}
    </div>
  );
}

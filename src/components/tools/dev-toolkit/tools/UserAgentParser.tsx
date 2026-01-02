import { useState, useMemo } from "react";
import { Copy, Check, Trash2, Monitor, Smartphone, Globe, Cpu } from "lucide-react";
import { UAParser } from "ua-parser-js";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface ParsedField {
  label: string;
  value: string | undefined;
  icon: React.ReactNode;
}

export function UserAgentParser() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!input.trim()) return null;
    const parser = new UAParser(input);
    return parser.getResult();
  }, [input]);

  const handleUseCurrentUA = () => {
    setInput(navigator.userAgent);
  };

  const handleCopy = async () => {
    if (!parsed) return;
    await navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  const fields: ParsedField[] = parsed
    ? [
        {
          label: "Browser",
          value: parsed.browser.name
            ? `${parsed.browser.name} ${parsed.browser.version || ""}`
            : undefined,
          icon: <Globe className="w-4 h-4" />,
        },
        {
          label: "Engine",
          value: parsed.engine.name
            ? `${parsed.engine.name} ${parsed.engine.version || ""}`
            : undefined,
          icon: <Cpu className="w-4 h-4" />,
        },
        {
          label: "OS",
          value: parsed.os.name
            ? `${parsed.os.name} ${parsed.os.version || ""}`
            : undefined,
          icon: <Monitor className="w-4 h-4" />,
        },
        {
          label: "Device",
          value:
            parsed.device.vendor || parsed.device.model || parsed.device.type
              ? [parsed.device.vendor, parsed.device.model, parsed.device.type]
                  .filter(Boolean)
                  .join(" ")
              : undefined,
          icon: <Smartphone className="w-4 h-4" />,
        },
        {
          label: "CPU Architecture",
          value: parsed.cpu.architecture,
          icon: <Cpu className="w-4 h-4" />,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">User Agent String</label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear} aria-label="Clear input">
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a user agent string here..."
          className={cn(
            "min-h-[80px] resize-y text-sm font-mono",
            "bg-bg-primary border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50"
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleUseCurrentUA} variant="primary" size="sm">
          Use Current Browser
        </Button>
        {parsed && (
          <Tooltip content={copied ? "Copied!" : "Copy as JSON"}>
            <IconButton size="sm" onClick={handleCopy} aria-label="Copy parsed data as JSON">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </IconButton>
          </Tooltip>
        )}
      </div>

      {parsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(
            (field) =>
              field.value && (
                <div
                  key={field.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border"
                >
                  <div className="text-accent">{field.icon}</div>
                  <div className="flex-1">
                    <div className="text-xs text-text-tertiary">{field.label}</div>
                    <div className="text-sm text-text-primary font-medium">{field.value}</div>
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {parsed && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-text-tertiary uppercase tracking-wider">Raw JSON</div>
          <pre className="p-3 rounded-lg bg-bg-tertiary/50 border border-border font-mono text-xs text-text-primary overflow-auto max-h-48">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      )}

      {!input.trim() && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter a user agent string or click "Use Current Browser"
        </div>
      )}
    </div>
  );
}

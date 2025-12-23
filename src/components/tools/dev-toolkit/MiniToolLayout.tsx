import { Copy, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import type { MiniToolLayoutProps } from "./types";

export function MiniToolLayout({
  inputLabel = "Input",
  inputPlaceholder = "Enter text...",
  outputLabel = "Output",
  value,
  onChange,
  output,
  error,
  actions,
  onClear,
}: MiniToolLayoutProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            {inputLabel}
          </label>
          {(value || output) && (
            <Tooltip content="Clear all">
              <IconButton size="sm" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={inputPlaceholder}
          className={cn(
            "flex-1 min-h-[120px] resize-y font-mono text-sm",
            "bg-bg-primary border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            error ? "border-red-500/50" : "border-border"
          )}
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            variant={action.variant ?? (index === 0 ? "primary" : "default")}
            size="sm"
            disabled={action.disabled ?? !value.trim()}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            {outputLabel}
          </label>
          {output && (
            <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
              <IconButton size="sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </div>
        <textarea
          value={output}
          readOnly
          placeholder="Result will appear here..."
          className={cn(
            "flex-1 min-h-[120px] resize-y font-mono text-sm",
            "bg-bg-tertiary/50 border border-border rounded-lg p-3",
            "placeholder:text-text-tertiary",
            "focus:outline-none"
          )}
        />
      </div>
    </div>
  );
}

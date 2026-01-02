import { useState, useMemo } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useCopyWithFeedback } from "@/hooks/useCopyWithFeedback";

interface BaseConversion {
  id: string;
  name: string;
  base: number;
  prefix: string;
}

const BASES: BaseConversion[] = [
  { id: "bin", name: "Binary", base: 2, prefix: "0b" },
  { id: "oct", name: "Octal", base: 8, prefix: "0o" },
  { id: "dec", name: "Decimal", base: 10, prefix: "" },
  { id: "hex", name: "Hexadecimal", base: 16, prefix: "0x" },
];

function parseNumber(value: string): bigint | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("0b")) {
      return BigInt(`0b${trimmed.slice(2)}`);
    }
    if (trimmed.startsWith("0o")) {
      return BigInt(`0o${trimmed.slice(2)}`);
    }
    if (trimmed.startsWith("0x")) {
      return BigInt(`0x${trimmed.slice(2)}`);
    }

    if (/^[01]+$/.test(trimmed) && trimmed.length > 3) {
      return BigInt(`0b${trimmed}`);
    }

    return BigInt(trimmed);
  } catch (error) {
    return null;
  }
}

function formatWithSeparator(value: string, groupSize: number): string {
  const groups: string[] = [];
  for (let i = value.length; i > 0; i -= groupSize) {
    groups.unshift(value.slice(Math.max(0, i - groupSize), i));
  }
  return groups.join(" ");
}

export function NumberBaseConverter() {
  const [input, setInput] = useState("");
  const [showGrouped, setShowGrouped] = useState(true);
  const { copy, isCopied } = useCopyWithFeedback();

  const number = useMemo(() => {
    if (!input.trim()) return null;
    return parseNumber(input);
  }, [input]);

  const conversions = useMemo(() => {
    if (number === null) return [];

    return BASES.map((base) => {
      let value = number.toString(base.base);
      if (base.base === 16) value = value.toUpperCase();

      const groupSize = base.base === 2 ? 4 : base.base === 16 ? 2 : 3;
      const grouped = showGrouped ? formatWithSeparator(value, groupSize) : value;

      return {
        ...base,
        value,
        displayValue: grouped,
        withPrefix: `${base.prefix}${value}`,
      };
    });
  }, [number, showGrouped]);

  const handleClear = () => {
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Input Number</label>
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
          placeholder="Enter number (auto-detects 0b, 0o, 0x prefixes)"
          className={cn(
            "px-3 py-2 text-sm font-mono",
            "bg-bg-primary border rounded-lg",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            input && number === null ? "border-red-500/50" : "border-border"
          )}
        />
        <div className="text-xs text-text-tertiary">
          Tip: Use 0b for binary, 0o for octal, 0x for hex, or just enter a decimal number
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showGrouped}
            onChange={(e) => setShowGrouped(e.target.checked)}
            className="accent-accent"
          />
          <span className="text-xs text-text-secondary">Group digits for readability</span>
        </label>
      </div>

      {input && number === null && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          Invalid number format. Try: 42, 0b101010, 0o52, or 0x2A
        </div>
      )}

      {conversions.length > 0 && (
        <div className="flex flex-col gap-2">
          {conversions.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
            >
              <div className="w-24 flex-shrink-0">
                <div className="text-xs text-text-tertiary">{conv.name}</div>
                <div className="text-xs text-text-tertiary">Base {conv.base}</div>
              </div>
              <div className="flex-1 min-w-0">
                <code className="font-mono text-sm text-text-primary break-all">
                  {conv.prefix && (
                    <span className="text-accent">{conv.prefix}</span>
                  )}
                  {conv.displayValue}
                </code>
              </div>
              <Tooltip content={isCopied(conv.id) ? "Copied!" : "Copy (with prefix)"}>
                <IconButton
                  size="sm"
                  onClick={() => copy(conv.withPrefix, conv.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Copy ${conv.name} value with prefix`}
                >
                  {isCopied(conv.id) ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {!input && (
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm">
          Enter a number to convert between bases
        </div>
      )}
    </div>
  );
}

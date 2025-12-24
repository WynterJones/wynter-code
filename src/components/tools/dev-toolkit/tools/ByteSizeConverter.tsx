import { useState, useMemo } from "react";
import { Copy, Check, Trash2, HardDrive } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface SizeUnit {
  id: string;
  name: string;
  shortName: string;
  bytes: number;
  isBinary: boolean;
}

const SIZE_UNITS: SizeUnit[] = [
  { id: "b", name: "Bytes", shortName: "B", bytes: 1, isBinary: true },
  { id: "kb", name: "Kilobytes", shortName: "KB", bytes: 1000, isBinary: false },
  { id: "kib", name: "Kibibytes", shortName: "KiB", bytes: 1024, isBinary: true },
  { id: "mb", name: "Megabytes", shortName: "MB", bytes: 1000 ** 2, isBinary: false },
  { id: "mib", name: "Mebibytes", shortName: "MiB", bytes: 1024 ** 2, isBinary: true },
  { id: "gb", name: "Gigabytes", shortName: "GB", bytes: 1000 ** 3, isBinary: false },
  { id: "gib", name: "Gibibytes", shortName: "GiB", bytes: 1024 ** 3, isBinary: true },
  { id: "tb", name: "Terabytes", shortName: "TB", bytes: 1000 ** 4, isBinary: false },
  { id: "tib", name: "Tebibytes", shortName: "TiB", bytes: 1024 ** 4, isBinary: true },
  { id: "pb", name: "Petabytes", shortName: "PB", bytes: 1000 ** 5, isBinary: false },
  { id: "pib", name: "Pebibytes", shortName: "PiB", bytes: 1024 ** 5, isBinary: true },
];

function formatNumber(value: number, precision: number = 6): string {
  if (value === 0) return "0";
  if (value >= 1) {
    const fixed = value.toFixed(precision);
    return parseFloat(fixed).toString();
  }
  return value.toPrecision(precision);
}

export function ByteSizeConverter() {
  const [input, setInput] = useState("");
  const [fromUnit, setFromUnit] = useState("mb");
  const [precision, setPrecision] = useState(4);
  const [copied, setCopied] = useState<string | null>(null);

  const bytes = useMemo(() => {
    const num = parseFloat(input);
    if (isNaN(num) || num < 0) return null;
    const unit = SIZE_UNITS.find((u) => u.id === fromUnit);
    if (!unit) return null;
    return num * unit.bytes;
  }, [input, fromUnit]);

  const conversions = useMemo(() => {
    if (bytes === null) return [];
    return SIZE_UNITS.map((unit) => ({
      ...unit,
      value: bytes / unit.bytes,
      displayValue: formatNumber(bytes / unit.bytes, precision),
    }));
  }, [bytes, precision]);

  const handleCopy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClear = () => {
    setInput("");
  };

  const decimalUnits = conversions.filter((c) => !c.isBinary || c.id === "b");
  const binaryUnits = conversions.filter((c) => c.isBinary);

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">Input Size</label>
          {input && (
            <Tooltip content="Clear">
              <IconButton size="sm" onClick={handleClear}>
                <Trash2 className="w-3.5 h-3.5" />
              </IconButton>
            </Tooltip>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter size..."
            className={cn(
              "flex-1 px-3 py-2 text-sm font-mono",
              "bg-bg-primary border border-border rounded-lg",
              "placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent/50"
            )}
          />
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="px-3 py-2 text-sm bg-bg-primary border border-border rounded-lg"
          >
            {SIZE_UNITS.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary">Precision:</label>
          <input
            type="number"
            min={0}
            max={15}
            value={precision}
            onChange={(e) => setPrecision(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))}
            className="w-14 px-2 py-1 text-sm bg-bg-primary border border-border rounded text-center"
          />
        </div>
      </div>

      {bytes !== null && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-xs text-text-tertiary uppercase tracking-wider">
              Decimal (SI) Units
            </div>
            {decimalUnits.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
              >
                <div className="w-12 text-xs text-text-tertiary flex-shrink-0">
                  {conv.shortName}
                </div>
                <code className="flex-1 font-mono text-sm text-text-primary truncate">
                  {conv.displayValue}
                </code>
                <Tooltip content={copied === conv.id ? "Copied!" : "Copy"}>
                  <IconButton
                    size="sm"
                    onClick={() => handleCopy(conv.displayValue, conv.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied === conv.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </IconButton>
                </Tooltip>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-xs text-text-tertiary uppercase tracking-wider">
              Binary (IEC) Units
            </div>
            {binaryUnits.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary border border-border group hover:border-accent/50 transition-colors"
              >
                <div className="w-12 text-xs text-text-tertiary flex-shrink-0">
                  {conv.shortName}
                </div>
                <code className="flex-1 font-mono text-sm text-text-primary truncate">
                  {conv.displayValue}
                </code>
                <Tooltip content={copied === `${conv.id}-bin` ? "Copied!" : "Copy"}>
                  <IconButton
                    size="sm"
                    onClick={() => handleCopy(conv.displayValue, `${conv.id}-bin`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copied === `${conv.id}-bin` ? (
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

      {bytes !== null && (
        <div className="p-3 rounded-lg bg-bg-secondary border border-border text-xs text-text-tertiary">
          <strong>Note:</strong> SI units (KB, MB, GB) use base 1000. IEC units (KiB, MiB, GiB) use
          base 1024. 1 GB = 1,000,000,000 bytes. 1 GiB = 1,073,741,824 bytes.
        </div>
      )}

      {!input && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-tertiary">
          <HardDrive className="w-8 h-8" />
          <span className="text-sm">Enter a size to convert</span>
        </div>
      )}
    </div>
  );
}
